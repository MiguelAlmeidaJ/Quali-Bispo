import { Header } from "../src/components/layout/Header";
import { Footer } from "../src/components/layout/Footer";
import { WhatsAppButton } from "../src/components/layout/WhatsAppButton";
import { Hero } from "../src/components/sections/Hero";
import { Benefits } from "../src/components/sections/Benefits";
import { PriceTable } from "../src/components/sections/PriceTable";
import { HowItWorks } from "../src/components/sections/HowItWorks";
import { Simulator } from "../src/components/sections/Simulator";
import { Plans } from "../src/components/sections/Plans";
import { Partners } from "../src/components/sections/Partners";
import { Faq } from "../src/components/sections/Faq";
import { CallToAction } from "../src/components/sections/CallToAction";
export default function ClubeHome() {
 return <><Header/><main><Hero/><Benefits/><PriceTable/><HowItWorks/><Simulator/><Plans/><Partners/><Faq/><CallToAction/></main><Footer/><WhatsAppButton/></>;
}
