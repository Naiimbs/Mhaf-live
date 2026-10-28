import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { Navbar } from "@/components/landing/navbar";
import { ProductSections } from "@/components/landing/product-sections";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ProductSections />
      </main>
      <Footer />
    </div>
  );
}
