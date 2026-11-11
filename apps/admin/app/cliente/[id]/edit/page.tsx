import {AdminApp} from "../../../../src/components/AdminApp";
export default async function EditarClientePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <AdminApp customerRoute={{mode:"edit",id}}/>;
}
