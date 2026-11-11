export type Partner = {
  id:string;
  name:string;
  serviceType:string;
  serviceTypes:string[];
  services:string;
  address:string;
  city:string;
  phone:string|null;
  businessHours:string;
  discountPercent:number;
  active:boolean;
  monthlyAttendances:number;
  createdAt:string;
  updatedAt:string;
};
export type PartnerInput = Pick<Partner,"name"|"serviceType"|"serviceTypes"|"services"|"address"|"city"|"phone"|"businessHours"|"discountPercent"|"active">;
export const newPartner:PartnerInput={
  name:"",serviceType:"Consultas médicas",serviceTypes:["Consultas médicas"],services:"",address:"",
  city:"",phone:null,businessHours:"Seg a sex: 8h às 17h · Sáb: 8h às 12h · Dom: fechado",
  discountPercent:50,active:true,
};
export const serviceTypes=["Consultas médicas","Exames e check-ups","Psicologia","Nutrição","Odontologia","Outros"];
