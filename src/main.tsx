
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { migrateLocalStoragePredictions, getMigrationStatus } from "./utils/migratePredictions";

  // Expose migration utilities in window for console access
  declare global {
    interface Window {
      blockcastMigration: {
        migrateLocalPredictions: typeof migrateLocalStoragePredictions;
        getMigrationStatus: typeof getMigrationStatus;
      };
    }
  }

  window.blockcastMigration = {
    migrateLocalPredictions: migrateLocalStoragePredictions,
    getMigrationStatus: getMigrationStatus
  };

  console.log('🔧 BlockCast Migration Tools Available:');
  console.log('   - window.blockcastMigration.getMigrationStatus() - Check migration status');
  console.log('   - window.blockcastMigration.migrateLocalPredictions() - Migrate localStorage bets to Supabase');

  createRoot(document.getElementById("root")!).render(<App />);
