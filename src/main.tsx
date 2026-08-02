import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { DEFAULT_RPC } from './utils/solana';
import '@solana/wallet-adapter-react-ui/styles.css';
import './index.css';

function Root() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <React.StrictMode>
      <ConnectionProvider endpoint={DEFAULT_RPC}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
