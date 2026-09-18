//! OpenBook Studio desktop shell — foundation + Gate 9 export host commands.
//!
//! Registers Tauri + the SQL plugin for SQLite connectivity, and the official
//! dialog plugin for native Save As / overwrite confirmation (ADR-0030).
//! Export filesystem writes use dedicated commands (no shell, no broad FS plugin).

use serde::Deserialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportFileWrite {
    path: String,
    bytes: Vec<u8>,
}

#[tauri::command]
fn export_path_exists(path: String) -> Result<bool, String> {
    let candidate = PathBuf::from(&path);
    if !is_safe_export_path(&candidate) {
        return Err(format!("Refusing unsafe export path: {path}"));
    }
    Ok(candidate.exists())
}

#[tauri::command]
fn export_write_atomically(files: Vec<ExportFileWrite>) -> Result<(), String> {
    if files.is_empty() {
        return Err("No export files to write.".to_string());
    }

    let mut temps: Vec<PathBuf> = Vec::new();
    let mut planned: Vec<(PathBuf, PathBuf)> = Vec::new();

    for file in &files {
        let target = PathBuf::from(&file.path);
        if !is_safe_export_path(&target) {
            cleanup_temps(&temps);
            return Err(format!("Refusing unsafe export path: {}", file.path));
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|err| {
                cleanup_temps(&temps);
                format!("Cannot create export directory {}: {err}", parent.display())
            })?;
        }
        let temp = temporary_path_for(&target);
        {
            let mut out = fs::File::create(&temp).map_err(|err| {
                cleanup_temps(&temps);
                format!("Cannot create temporary export file {}: {err}", temp.display())
            })?;
            out.write_all(&file.bytes).map_err(|err| {
                cleanup_temps(&temps);
                let _ = fs::remove_file(&temp);
                format!("Cannot write temporary export file {}: {err}", temp.display())
            })?;
            out.sync_all().map_err(|err| {
                cleanup_temps(&temps);
                let _ = fs::remove_file(&temp);
                format!("Cannot sync temporary export file {}: {err}", temp.display())
            })?;
        }
        temps.push(temp.clone());
        planned.push((temp, target));
    }

    for (temp, target) in &planned {
        if let Err(err) = fs::rename(temp, target) {
            // Windows may refuse rename-over-existing; replace explicitly.
            let _ = fs::remove_file(target);
            if let Err(replace_err) = fs::rename(temp, target) {
                cleanup_temps(&temps);
                return Err(format!(
                    "Cannot finalize export file {}: {err}; replace failed: {replace_err}",
                    target.display()
                ));
            }
        }
    }

    Ok(())
}

fn temporary_path_for(target: &Path) -> PathBuf {
    let file_name = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("export.bin");
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    target.with_file_name(format!(".{file_name}.openbook-tmp-{stamp}"))
}

fn cleanup_temps(temps: &[PathBuf]) {
    for temp in temps {
        let _ = fs::remove_file(temp);
    }
}

fn is_safe_export_path(path: &Path) -> bool {
    let raw = path.to_string_lossy();
    if raw.trim().is_empty() || raw.contains('\0') {
        return false;
    }
    if raw.ends_with('/') || raw.ends_with('\\') {
        return false;
    }
    let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
        return false;
    };
    if name.is_empty() || name == "." || name == ".." {
        return false;
    }
    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Connectivity only — no migrations / production schema (ADR-0007 §6).
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Native Save As / overwrite confirmation for Gate 9 export (ADR-0030).
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            export_path_exists,
            export_write_atomically
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenBook desktop shell");
}
