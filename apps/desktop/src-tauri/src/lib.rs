//! OpenBook Studio desktop shell — foundation scaffold only.
//!
//! Registers Tauri + the SQL plugin for SQLite *connectivity proof*.
//! Does not define production persistence schema, migrations, or a domain DB model.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Connectivity only — no migrations / production schema (ADR-0007 §6).
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running OpenBook desktop shell");
}
