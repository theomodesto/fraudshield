import { startServer } from './server';

// Start the server
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Log startup
console.log(`
  ____                    _ ____  _     _      _     _ 
 / ___|_ __ __ _ _   _  | / ___|| |__ (_) ___| | __| |
| |  _| '__/ _\` | | | | | \\___ \\| '_ \\| |/ _ \\ |/ _\` |
| |_| | | | (_| | |_| | | |___) | | | | |  __/ | (_| |
 \\____|_|  \\__,_|\\__,_| |_|____/|_| |_|_|\\___|_|\\__,_|
                                                       
 Evaluator Service
 Version: 0.0.1
`); 