import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './api/gerar-plano'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Disponibiliza as variáveis no backend local
  process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY || env.VITE_GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'api-gerar-plano-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/gerar-plano')) {
              try {
                // Ler o body do request
                let body = '';
                await new Promise<void>((resolve, reject) => {
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', () => resolve());
                  req.on('error', err => reject(err));
                });
                
                (req as any).body = body ? JSON.parse(body) : {};
                
                // Emular a resposta do Express
                const mockRes = {
                  status(code: number) {
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                  setHeader(name: string, value: string) {
                    res.setHeader(name, value);
                    return this;
                  },
                  end(data?: any) {
                    res.end(data);
                    return this;
                  }
                };

                await handler(req, mockRes);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Erro no servidor local', details: err.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
  };
})

