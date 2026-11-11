export type Category = "cons" | "check" | "terap";
export type Procedure = { category: Category; specialty: string; professional: string; quali: number; normal: number };
export const procedures: Procedure[] = [
["cons","Alergista","Dra. Daniella Damiana",65,120],["cons","Angiologista","Dr. Rafael e Dr. Flávio",55,110],
["cons","Cardiologista","Dra. Isabela e Dr. João Paulo",55,110],["cons","Clínico geral","Dr. Sávio",55,110],
["cons","Dermatologista","Dra. Julia",55,110],["cons","Dermatologista","Dra. Monique",60,110],
["cons","Endocrinologista","Dra. Ana Paula, Dra. Luísa e Dra. Ana Carolina",60,110],
["cons","Gastroenterologista","Dra. Cynara",60,110],["cons","Ginecologista","Dra. Patrícia e Dra. Naiana",55,110],
["cons","Ginecologista — consulta + preventivo","Dra. Patrícia e Dra. Naiana",100,160],
["cons","Nefrologista","Dra. Daniella Mata",130,180],["cons","Neurologista","Dr. Roberto, Dr. Thiago e Dra. Luiza",105,140],
["cons","Neuropediatra","Dra. Luiza Lima",200,240],["cons","Oftalmologista","Dra. Raissa",75,130],
["cons","Ortopedista / reumatologista","Dr. Renato",65,110],["cons","Otorrinolaringologista","Dr. Mateus",55,110],
["cons","Pediatra","Dra. Michelle",65,110],["cons","Pneumologista","Dra. Bruna",100,140],
["cons","Proctologista","Dra. Ana Luisa",60,110],["cons","Psiquiatra","",75,110],
["cons","Psiquiatria infantil","Dra. Michelle",100,150],["cons","Urologista","Dr. Ricardo",55,110],
["check","Check-up cardiológico","Dra. Isabela e Dr. João Paulo",369,410],
["check","Check-up ginecológico","Dra. Patrícia e Dra. Naiana",391.5,435],
["check","Check-up urológico","Dr. Ricardo",279,310],
["terap","Psicóloga — consulta","Dra. Danielle",65,110],
["terap","Psicóloga — pacote Quali Benefícios","Dra. Danielle",414,460],
["terap","Nutricionista","Dra. Elôa",60,110]
].map(([category,specialty,professional,quali,normal])=>({category:category as Category,specialty:String(specialty),professional:String(professional),quali:Number(quali),normal:Number(normal)}));
export const money = (value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value);
export const partners = [
{name:"Unidade Largo da Batalha",address:"Estr. Washington Luís, 47 – Sapê / Largo da Batalha",city:"Niterói/RJ",discount:50},
{name:"Unidade Venda da Cruz",address:"R. Dr. March, 5 – Venda da Cruz",city:"São Gonçalo/RJ",discount:50},
{name:"Unidade Vila Lage",address:"R. Dr. Alberto Torres, 1631 – Vila Lage",city:"São Gonçalo/RJ",discount:50},
{name:"Unidade Mutuá",address:"Av. Dezoito do Forte, 317 – Mutuá",city:"São Gonçalo/RJ",discount:50}
];
export const faqs: [string,string][] = [
["O Cartão Quali é um plano de saúde?","Não. É um clube de benefícios que garante descontos em serviços de saúde na rede parceira. Você paga diretamente ao parceiro o valor já com desconto."],
["Tem carência?","Não. Os descontos podem ser usados logo após a confirmação da adesão."],
["Quem pode ser dependente?","No plano Familiar, o titular pode incluir até 2 dependentes, como cônjuge, filhos ou pais."],
["Como uso o desconto?","Agende no parceiro, informe que é associado Quali e apresente a carteirinha com um documento com foto."],
["Onde baixo minha carteirinha?","Na Área do associado deste site, informando CPF e data de nascimento. A integração com a API está em desenvolvimento."],
["O que acontece se eu atrasar a mensalidade?","Os descontos podem ficar suspensos em caso de inadimplência. Consulte o atendimento para as condições aplicáveis."],
["Existe limite de uso?","Cada beneficiário pode fazer até 3 consultas com desconto por mês, somando consultas médicas, psicologia e nutrição. Check-ups não entram nesse limite."],
["Quanto custa uma consulta com o cartão?","A maioria das especialidades sai por R$ 55,00 a R$ 65,00. Veja a tabela completa nesta página."],
["Em quais unidades posso ser atendido?","Largo da Batalha, Venda da Cruz, Vila Lage e Mutuá. Segunda a sexta, 8h às 17h; sábado, 8h às 12h."],
["Como cancelo?","Entre em contato com Amanda, do time comercial, pelo (32) 9938-8743."]
];
