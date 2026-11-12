import {deflateSync} from "node:zlib";
import sharp from "sharp";
import {readBrandAsset} from "./branding.service";

// ID-1 / ISO 7810: 85,60 × 53,98 mm. A página inteira É o cartão:
// não existem margens, marcas de corte, cabeçalhos ou páginas extras.
const WIDTH=85.6*72/25.4;
const HEIGHT=53.98*72/25.4;
type CardData={name:string;number:string;cpfLast4:string;birthDate:Date;relationship?:"Titular"|"Dependente"};
type Font="F1"|"F2"|"F3";

class PdfDocument {
 private objects:Buffer[]=[];
 reserve(){this.objects.push(Buffer.alloc(0));return this.objects.length;}
 set(id:number,value:string|Buffer){this.objects[id-1]=typeof value==="string"?Buffer.from(value,"latin1"):value;}
 add(value:string|Buffer){const id=this.reserve();this.set(id,value);return id;}
 stream(dictionary:string,bytes:Buffer){
  return Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${bytes.length} >>\nstream\n`,"ascii"),
   bytes,Buffer.from("\nendstream","ascii")]);
 }
 finish(root:number){
  const header=Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","latin1");
  const parts:Buffer[]=[header],offsets=[0];
  let position=header.length;
  this.objects.forEach((obj,index)=>{
   if(obj.length===0)throw new Error(`Objeto PDF ${index+1} sem conteúdo`);
   offsets.push(position);
   const item=Buffer.concat([
    Buffer.from(`${index+1} 0 obj\n`,"ascii"),obj,Buffer.from("\nendobj\n","ascii")]);
   parts.push(item);position+=item.length;
  });
  const xrefStart=position;
  const xref=[`xref\n0 ${this.objects.length+1}\n0000000000 65535 f \n`,
   ...offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`),
   `trailer\n<< /Size ${this.objects.length+1} /Root ${root} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`].join("");
  parts.push(Buffer.from(xref,"ascii"));
  return Buffer.concat(parts);
 }
}
function asciiNumber(n:number){return Number(n.toFixed(3)).toString();}
function hexWinAnsi(input:string){
 const specials:Record<number,number>={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,
 0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,
 0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,
 0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,
 0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
 const bytes:number[]=[];
 for(const symbol of input){
  const code=symbol.codePointAt(0)!;
  if(code>=32&&code<=255&&!(code>=127&&code<=159))bytes.push(code);
  else if(specials[code]!==undefined)bytes.push(specials[code]);
  else if(code===10)bytes.push(32);
  else {
   for(const c of symbol.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")){
    const x=c.charCodeAt(0);
    bytes.push(x>=32&&x<=126?x:63);
   }
  }
 }
 return Buffer.from(bytes).toString("hex").toUpperCase();
}
function textCommand(value:string,x:number,y:number,size:number,font:Font,color=[1,1,1]){
 return `BT /${font} ${asciiNumber(size)} Tf ${color.map(asciiNumber).join(" ")} rg ${asciiNumber(x)} ${asciiNumber(y)} Td <${hexWinAnsi(value)}> Tj ET\n`;
}
function escapeName(value:string){
 return value.replace(/\s+/g," ").trim().slice(0,140);
}
// Aproximação conservadora, para não cortar sobrenomes nas bordas.
function nameSize(name:string){return Math.max(6.8,Math.min(10.4,197/Math.max(1,name.length*.57)));}
function pdfDate(date:Date){return `${String(date.getUTCDate()).padStart(2,"0")}/${String(date.getUTCMonth()+1).padStart(2,"0")}/${date.getUTCFullYear()}`;}
async function addWhiteLogo(pdf:PdfDocument){
 try{
  const file=await readBrandAsset("logo-white");
  const {data,info}=await sharp(file,{limitInputPixels:3_000_000})
   .resize({width:520,height:200,fit:"inside",withoutEnlargement:true})
   .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==4||info.width<1||info.height<1)throw new Error("Imagem inválida");
  const rgb=Buffer.alloc(info.width*info.height*3),alpha=Buffer.alloc(info.width*info.height);
  for(let i=0,j=0,k=0;i<data.length;i+=4){
   rgb[j++]=data[i];rgb[j++]=data[i+1];rgb[j++]=data[i+2];alpha[k++]=data[i+3];
  }
  const mask=pdf.add(pdf.stream(`/Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,deflateSync(alpha)));
  const image=pdf.add(pdf.stream(`/Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${mask} 0 R`,deflateSync(rgb)));
  return {image,width:info.width,height:info.height};
 }catch{return null;}
}
export async function makeMemberCardPdf(card:CardData):Promise<Buffer>{
 if(!/^\d{12}$/.test(card.number)||!/^[0-9]{4}$/.test(card.cpfLast4)||!Number.isFinite(card.birthDate.getTime()))
  throw new Error("Cadastro sem dados suficientes para emissão");
 const pdf=new PdfDocument();
 const catalog=pdf.reserve(),pages=pdf.reserve(),page=pdf.reserve();
 const regular=pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
 const bold=pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
 const mono=pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>");
 const gradient=pdf.add(`<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 ${asciiNumber(HEIGHT)} ${asciiNumber(WIDTH)} 0] /Function << /FunctionType 2 /Domain [0 1] /C0 [0.13 0.56 0.31] /C1 [0.05 0.29 0.22] /N 1 >> /Extend [true true] >>`);
 const logo=await addWhiteLogo(pdf);
 let content=`q 0 0 ${asciiNumber(WIDTH)} ${asciiNumber(HEIGHT)} re W n /Sh1 sh Q\n`;
 // Detalhe decorativo vetorial em tom de verde, sem interferir com o texto.
 content+="q 0.17 0.53 0.36 rg 198 165 m 229 170 260 145 267 111 c 272 85 251 77 232 79 c 205 83 190 110 198 165 c f Q\n";
 if(logo){
  const maxW=88,maxH=34,scale=Math.min(maxW/logo.width,maxH/logo.height);
  const w=logo.width*scale,h=logo.height*scale;
  content+=`q ${asciiNumber(w)} 0 0 ${asciiNumber(h)} 18 ${asciiNumber(HEIGHT-15-h)} cm /Logo Do Q\n`;
 }else{
  // Ausência do ativo configurável: marca vetorial/textual, nunca bloco opaco.
  content+=textCommand("Quali",19,119,24,"F2");
  content+=textCommand("Benefícios",48,109,7.8,"F1");
 }
 const formatted=card.number.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3");
 content+=textCommand(formatted,19,78,13.3,"F3");
 const fullName=escapeName(card.name).toLocaleUpperCase("pt-BR");
 if(fullName.length<=40){
  content+=textCommand(fullName,19,52,nameSize(fullName),"F2");
 }else{
  // Até duas linhas, sem encostar nos dados inferiores do cartão.
  const words=fullName.split(" "),lines=["",""];
  for(const word of words){
   const left=lines[0]?lines[0]+" "+word:word;
   if(left.length<=Math.ceil(fullName.length/2)||!lines[0])lines[0]=left;
   else lines[1]=lines[1]?lines[1]+" "+word:word;
  }
  const longest=Math.max(lines[0].length,lines[1].length);
  const size=Math.max(6.5,Math.min(9.3,197/(longest*.58)));
  content+=textCommand(lines[0],19,57,size,"F2");
  if(lines[1])content+=textCommand(lines[1],19,46,size,"F2");
 }
 content+=textCommand("CPF (final)",19,32,6.7,"F1",[0.77,0.90,0.84]);
 content+=textCommand("Vínculo",95,32,6.7,"F1",[0.77,0.90,0.84]);
 content+=textCommand("Nascimento",155,32,6.7,"F1",[0.77,0.90,0.84]);
 content+=textCommand("•••• "+card.cpfLast4,19,20,8,"F2");
 content+=textCommand(card.relationship||"Titular",95,20,7.5,"F2");
 content+=textCommand(pdfDate(card.birthDate),155,20,8,"F2");
 const stream=pdf.add(pdf.stream("",Buffer.from(content,"ascii")));
 const resources=`/Font << /F1 ${regular} 0 R /F2 ${bold} 0 R /F3 ${mono} 0 R >> /Shading << /Sh1 ${gradient} 0 R >>${logo?` /XObject << /Logo ${logo.image} 0 R >>`:""}`;
 pdf.set(page,`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${asciiNumber(WIDTH)} ${asciiNumber(HEIGHT)}] /Resources << ${resources} >> /Contents ${stream} 0 R >>`);
 pdf.set(pages,`<< /Type /Pages /Count 1 /Kids [${page} 0 R] >>`);
 pdf.set(catalog,`<< /Type /Catalog /Pages ${pages} 0 R >>`);
 return pdf.finish(catalog);
}
