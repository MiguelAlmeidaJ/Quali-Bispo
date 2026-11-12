import type {Metadata} from "next";
import {MemberPortal} from "../../src/components/member/MemberPortal";
export const metadata:Metadata={
 title:"Área do associado | Quali Benefícios",
 description:"Consulte sua situação, atendimentos e benefícios Quali.",
 robots:{index:false,follow:false},
};
export default function AssociadoPage(){return <MemberPortal/>;}
