import { Wallet } from "lucide-react";
import { Button } from "../ui";
import { useStellarWallet } from "./stellar-wallet";
import { formatStellarAddress } from "./stellar";
import { useState } from "react";
import { WalletModal } from "../components/WalletModal";

export default function ConnectButton() {
    const { walletState, disconnect } = useStellarWallet();
    const [showWalletModal, setShowWalletModal] = useState(false);

    if (walletState.isConnected && walletState.publicKey) {
        return (
            <Button
                size="large"
                variant="destructive-primary"
                icon={<Wallet size={20} />}
                className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
                onClick={() => disconnect()}
            >
                Disconnect {formatStellarAddress(walletState.publicKey)}
            </Button>
        );
    }

    return (
        <>
            <Button
                size="large"
                variant="destructive-primary"
                icon={<Wallet size={20} />}
                className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
                onClick={() => setShowWalletModal(true)}
            >
                Connect Wallet
            </Button>
            <WalletModal 
                isOpen={showWalletModal} 
                onClose={() => setShowWalletModal(false)} 
            />
        </>
    );
}