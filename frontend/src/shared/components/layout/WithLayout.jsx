import Navbar from "./Navbar";
import Footer from "./Footer";

const WithLayout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </>
);

export default WithLayout;
