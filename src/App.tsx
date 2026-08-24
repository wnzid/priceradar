import {HashRouter,Link,Route,Routes} from "react-router-dom";
import {ShoppingListProvider,useShoppingList} from "./hooks/useShoppingList";
import {Home} from "./pages/Home";
import {Product} from "./pages/Product";
import {ShoppingList} from "./pages/ShoppingList";
import {Legal} from "./pages/Legal";
import {Privacy} from "./pages/Privacy";
import {Contact} from "./pages/Contact";
import {SiteFooter} from "./components/SiteFooter";

function Shell(){const{items}=useShoppingList();return <HashRouter><header className="site-header"><Link className="brand" to="/"><span className="radar">◉</span>PriceRadar</Link><nav aria-label="Primary navigation"><Link to="/">Deals</Link><Link to="/shopping-list">Shopping List <span className="nav-count">{items.length}</span></Link></nav><span className="locale">LT · EUR</span></header><div className="shell"><Routes><Route path="/" element={<Home/>}/><Route path="/shopping-list" element={<ShoppingList/>}/><Route path="/products/:id" element={<Product/>}/><Route path="/legal" element={<Legal/>}/><Route path="/privacy" element={<Privacy/>}/><Route path="/contact" element={<Contact/>}/></Routes></div><SiteFooter/></HashRouter>}
export default function App(){return <ShoppingListProvider><Shell/></ShoppingListProvider>}
