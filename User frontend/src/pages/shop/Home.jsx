import HeroSection from "@/features/products/components/HeroSection";
import Category from "@/features/products/components/Category";
import ProductSlider from "@/features/products/components/ProductSlider";
import Newsletter from "@/shared/components/layout/Newsletter";
import Reveal from "@/shared/components/ui/Reveal";

const Home = () => {
  return (
    <>
      <HeroSection />
      
      <Reveal direction="up" delay={0.1}>
        <ProductSlider 
          title="Newly Curated" 
          fetchUrl="/api/product/public/all?sort=popularity&limit=8"
          viewAllLink="/shop"
        />
      </Reveal>
      
      <Reveal direction="up">
        <Category />
      </Reveal>
 
      <Reveal direction="up" delay={0.1}>
        <ProductSlider 
          title="Carefully Selected" 
          fetchUrl="/api/product/public/all?sort=newest&limit=8"
          viewAllLink="/shop?sort=newest"
        />
      </Reveal>
 
      <Reveal direction="up">
        <ProductSlider 
          title="Customer Favourites" 
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
