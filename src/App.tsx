
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import DashboardLayout from "./components/DashboardLayout";
import { LandingPage } from "./components/LandingPage";
import { Header } from "./components/Header";


function App() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("gemetra_active_tab") || "landing";
  });

  // persist active tab
  useEffect(() => {
    localStorage.setItem("gemetra_active_tab", activeTab);
  }, [activeTab]);

  // handle redirects
  useEffect(() => {
    if (isConnected && activeTab === "landing") {
      setActiveTab("dashboard");
    } else if (!isConnected && !["landing"].includes(activeTab)) {
      setActiveTab("landing");
    }
  }, [isConnected, activeTab]);

  const renderActiveComponent = () => {
    if (isConnected && ["dashboard", "employees", "bulk-transfer", "ai-assistant-chat", "ai-assistant-history", "settings"].includes(activeTab)) {
      // Load company name from localStorage if available
      const savedCompanyName = address 
        ? localStorage.getItem(`gemetra_company_name_${address}`) || 'My Company'
        : 'My Company';
      return <DashboardLayout companyName={savedCompanyName} />;
    }
    return <LandingPage />;
  };

  return (
    <div className="min-h-screen bg-white relative">
      <div className="relative z-10">
        {!isConnected && activeTab !== "landing" && (
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isWalletConnected={isConnected}
            walletAddress={address || ""}
            onGetStarted={() => {}}
            user={null}
          />
        )}

        <main className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isConnected ? "dashboard" : "landing"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderActiveComponent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
   
    </div>
  );
}

export default App;
