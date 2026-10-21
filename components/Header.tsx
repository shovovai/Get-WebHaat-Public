import { getMenuData } from "@/lib/menuData";
import ClientHeader from "./ClientHeader";

// No Suspense around the header: it renders in the server HTML. The only
// search-params reader (sign-in redirect) has its own boundary inside.
const Header = async () => {
  const menu = await getMenuData();

  return <ClientHeader categories={menu.categories} sections={menu.sections} />;
};

export default Header;
