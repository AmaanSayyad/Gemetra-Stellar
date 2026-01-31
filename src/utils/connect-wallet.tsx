import { Wallet } from "lucide-react";
import { Button } from "../ui";
import { useStellarWallet } from "./stellar-wallet";
import { formatStellarAddress } from "./stellar";

export default function ConnectButton() {
    const { walletState, disconnect, connect } = useStellarWallet();

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
        <Button
            size="large"
            variant="destructive-primary"
            icon={<Wallet size={20} />}
            className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
            onClick={() => connect()}
        >
            Connect Wallet
        </Button>
    );
}