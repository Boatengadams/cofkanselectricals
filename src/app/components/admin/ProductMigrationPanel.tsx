import { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { runFullMigration } from '../../../scripts/migrate-products';

export function ProductMigrationPanel() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, productName: '' });
  const [result, setResult] = useState<{ migrated: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    setStatus('running');
    setProgress({ current: 0, total: 0, productName: '' });
    setResult(null);
    setError(null);

    try {
      const migrationResult = await runFullMigration((current, total, productName) => {
        setProgress({ current, total, productName });
      });

      setResult(migrationResult);
      setStatus('success');
    } catch (err) {
      console.error('Migration error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl border-2 border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-secondary to-primary p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Database className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">Product Migration</h2>
              <p className="text-white/90 text-sm">Upload all products to Firebase Firestore</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Info Banner */}
          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-2 text-foreground">Migration Details:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">137 products</strong> will be migrated to Firestore</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">5 categories</strong> will be created</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Stock will be distributed across <strong className="text-foreground">3 warehouses</strong> (Accra 50%, Kumasi 35%, Takoradi 15%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>All product images and metadata will be preserved</span>
              </li>
            </ul>
          </div>

          {/* Status Display */}
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Progress Bar */}
              {status === 'running' && progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Migrating products...</span>
                    <span className="font-bold text-foreground">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {progress.productName && (
                    <p className="text-xs text-muted-foreground truncate">
                      Current: <span className="text-foreground font-medium">{progress.productName}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Success Message */}
              {status === 'success' && result && (
                <div className="flex items-start gap-4 p-6 bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-2xl">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="font-bold text-green-700 dark:text-green-400 mb-1">Migration Successful!</h4>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Successfully migrated <strong>{result.migrated}</strong> out of <strong>{result.total}</strong> products to Firestore.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {status === 'error' && (
                <div className="flex items-start gap-4 p-6 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">Migration Failed</h4>
                    <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: status === 'running' ? 1 : 1.02, y: -2 }}
            whileTap={{ scale: status === 'running' ? 1 : 0.98 }}
            onClick={handleMigration}
            disabled={status === 'running'}
            className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
              status === 'running'
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-gradient-to-r from-primary via-secondary to-primary text-white hover:shadow-2xl hover:shadow-primary/50 cursor-pointer'
            }`}
          >
            {status === 'running' ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" strokeWidth={2.5} />
                <span>Migrating Products...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" strokeWidth={2.5} />
                <span>{status === 'success' ? 'Re-run Migration' : 'Start Migration'}</span>
              </>
            )}
          </motion.button>

          {/* Warning */}
          {status === 'idle' && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p className="font-semibold text-foreground">⚠️ Important Notes:</p>
              <p>This will upload all products to your Firebase Firestore database.</p>
              <p>Make sure you're ready to populate your production database.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
