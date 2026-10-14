/** Bundled source files are private deployment assets, never public/ assets. */
export const projectDossiers:Record<string,{blockId:string;filename:string;path:string}>={
 '39ca156f-0de5-4de5-a22a-4c9480227bf7':{blockId:'4efa35a8-a878-51ec-bacc-f3b894ba5bd5',filename:'Tony-Rivera-Contigo-el-Tiempo-Vuela-Dossier.docx',path:'tony-rivera-contigo-el-tiempo-vuela.docx'}
};
export function projectDossier(id:string){return Object.hasOwn(projectDossiers,id)?projectDossiers[id]:null;}
