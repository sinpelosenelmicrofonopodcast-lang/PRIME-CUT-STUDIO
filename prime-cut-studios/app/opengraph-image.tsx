import {ImageResponse} from 'next/og';
export const alt='Prime Cut Studios — Photography & Film in Central Texas';
export const size={width:1200,height:630};export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',flexDirection:'column',justifyContent:'space-between',padding:72,background:'#10100e',color:'#f5f2ea',fontFamily:'sans-serif',borderBottom:'12px solid #d6b46d'}}><div style={{display:'flex',fontSize:25,letterSpacing:6,color:'#d6b46d'}}>PRIME CUT STUDIOS</div><div style={{display:'flex',fontSize:94,fontWeight:800,lineHeight:1.05}}>Make it unforgettable.</div><div style={{display:'flex',fontSize:27}}>Photography & Film · Central Texas</div></div>,size);}
