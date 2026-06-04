import HeroSection from "@/features/products/components/HeroSection";
import Category from "@/features/products/components/Category";
import ProductSlider from "@/features/products/components/ProductSlider";
import Newsletter from "@/shared/components/layout/Newsletter";
import Reveal from "@/shared/components/ui/Reveal";

const Home = () => {
  return (
    <>
      <Reveal direction="up" duration={1.0}>
        <HeroSection />
      </Reveal>
      
      <Reveal direction="up" delay={0.1}>
        <ProductSlider 
          title="Trending Now" 
          fetchUrl="/api/product/public/all?sort=popularity&limit=8"
          viewAllLink="/shop/women"
        />
      </Reveal>
      
      <Reveal direction="up">
        <Category />
      </Reveal>

      <Reveal direction="up" delay={0.1}>
        <ProductSlider 
          title="New Arrivals" 
          fetchUrl="/api/product/public/all?sort=newest&limit=8"
          viewAllLink="/shop/new-arrivals"
        />
      </Reveal>

      <Reveal direction="up">
        <ProductSlider 
          title="Best Sellers" 
          fetchUrl="/api/product/public/all?sort=rating&limit=8"
        />
      </Reveal>

      <Reveal direction="up" delay={0.1}>
        <Newsletter />
      </Reveal>
    </>
  );
};

export default Home;
