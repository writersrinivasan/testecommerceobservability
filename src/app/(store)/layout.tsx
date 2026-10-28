import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import ChatWidget from "@/components/store/ChatWidget";
import ApiKeyDialog from "@/components/ApiKeyDialog";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
      <ApiKeyDialog />
    </div>
  );
}
