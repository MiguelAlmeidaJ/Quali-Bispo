import type { ReactNode } from "react";
export function SectionHeading({eyebrow,title,children}:{eyebrow:string;title:string;children?:ReactNode}){
  return <div className="sec-h"><span className="eye">{eyebrow}</span><h2>{title}</h2>{children&&<p>{children}</p>}</div>;
}
