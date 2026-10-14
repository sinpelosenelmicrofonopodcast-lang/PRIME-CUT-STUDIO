export type CastingVisual={
  image:string;
  subtitle:string;
  shortTitle:string;
  tone:string;
  tag:string;
  paymentLabel:string;
  paymentDetail:string;
  compensated:boolean|null;
  facts:{label:string;value:string}[];
  story:string;
  roles:string[];
  look:string[];
  shoot:string[];
  notes:string[];
};
export const castingPresentation:Record<string,CastingVisual>={
  '5336e475-8dc8-4b47-a852-aeaf12fc7472':{
    image:'/casting/concept-arty.jpg',
    subtitle:'Videoclip urbano · Ambiente de taberna cinematográfica',
    shortTitle:'Arty — Davy Jones',
    tone:'Oscuro · Misterioso · Nocturno',
    tag:'Actores y figurantes',
    paymentLabel:'Compensación por confirmar',
    paymentDetail:'La tarifa y las condiciones se comunicarán antes de ofrecer cualquier papel. No se solicita trabajo no remunerado por medio de esta convocatoria.',
    compensated:null,
    facts:[
      {label:'Lugar',value:'Central Texas'},
      {label:'Jornada',value:'1 día de rodaje · por confirmar'},
      {label:'Edad',value:'18 años o más'},
      {label:'Experiencia',value:'No indispensable'}
    ],
    story:'Un encuentro inesperado en un bar de ambiente nocturno: el protagonista llega con una nueva acompañante y se cruza con su expareja y su nueva relación. Una historia de miradas, tensión, seguridad y estilo, con una estética inspirada en el misterio náutico y la fantasía cinematográfica.',
    roles:[
      'Actriz adulta: la expareja del protagonista.',
      'Actriz o modelo adulta: la acompañante del protagonista.',
      'Actor adulto: la nueva pareja de la ex.',
      'Bartender o personal de barra.',
      'Figurantes adultos: clientes del bar y ambiente social.'
    ],
    look:[
      'Presencia natural, expresividad y seguridad frente a cámara.',
      'Estilo nocturno, elegante y pulcro, coordinado por producción.',
      'Capacidad para seguir dirección y mantener continuidad entre tomas.'
    ],
    shoot:[
      'Grabación en local interior de Central Texas; horario por confirmar.',
      'Fechas y vestuario se compartirán con las personas preseleccionadas.'
    ],
    notes:['Indica el papel que deseas interpretar en la sección Experiencia.', 'La imagen es una referencia conceptual generada, no una fotografía del artista, el elenco o la locación definitiva.']
  },
  'e34e22b6-fffb-4098-acc0-573e9e5f2a90':{
    image:'/casting/concept-romantic.jpg',
    subtitle:'Videoclip romántico · Pareja protagonista',
    shortTitle:'Una historia de amor',
    tone:'Cálido · Íntimo · Cinematográfico',
    tag:'Dos protagonistas',
    paymentLabel:'Casting remunerado',
    paymentDetail:'Tarifa propuesta: $200 por persona por una jornada de hasta 6 horas. Condiciones finales, horario y forma de pago se confirmarán por escrito antes de contratar.',
    compensated:true,
    facts:[
      {label:'Pago propuesto',value:'$200 por persona · hasta 6 h'},
      {label:'Lugar',value:'Killeen, Salado o Lampasas'},
      {label:'Perfiles',value:'Hombre y mujer · 20–25 años'},
      {label:'Experiencia',value:'No requerida'}
    ],
    story:'Una relación que transforma lo cotidiano en momentos inolvidables. Buscamos dos personas capaces de transmitir conexión auténtica, ternura y confianza a través de escenas sencillas, cercanas y visualmente cinematográficas.',
    roles:[
      'Protagonista femenina: adulta, de 20 a 25 años.',
      'Protagonista masculino: adulto, de 20 a 25 años.',
      'Preferencia por parejas reales; también aceptamos solicitudes individuales.'
    ],
    look:[
      'Vestuario casual conservador, colores neutros y ropa limpia y clásica.',
      'Aspecto fresco, atractivo y elegante, con peinados naturales y accesorios discretos.',
      'Química y expresividad para escenas románticas apropiadas, sin desnudez.'
    ],
    shoot:[
      'Una jornada en Killeen, Salado o Lampasas, Texas.',
      'Fecha tentativa: antes del 8 de noviembre de 2026; fecha exacta por confirmar.'
    ],
    notes:['Si aplicas como pareja, indícalo en Experiencia. Cada adulto debe presentar su propia solicitud.', 'La imagen es una referencia conceptual generada, no una fotografía del elenco o la locación definitiva.']
  }
};
