
export interface User {
  id: string;
  username: string; // "Nome de guerra"
  password?: string; // Not stored in localStorage for security, only used during signup
  rank: string;
  platoon: string;
}

export interface ActivityReport {
  id: string;
  userId: string;
  submittedBy: string;
  submittedAt: string;
  equipesIntegradas: string;
  numeroRso: string;
  tipoEscala: string;
  tempoTrabalho: string;
  pelotao: string;
  encarregadoEquipe: string;
  primeiroAuxiliar: string;
  segundoAuxiliar: string;
  fiscalizacaoTCRA: number;
  fiscalizacoesPatioMadeireiro: number;
  fiscalizacoesUC: number;
  fiscalizacoesRPPN: number;
  fiscalizacoesCriadorAmador: number;
  fiscalizacoesCaca: number;
  fiscalizacoesPesca: number;
  fiscalizacoesPiracema: number;
  tva: number;
  boPamb: number;
  aia: number;
  multaArbitrada: string;
  areaAutuada: number;
  palmitoInNatura: number;
  palmitoBeneficiado: string;
  pescadoApreendido: string;
  animaisApreendidos: number;
  pessoasAbordadas: number;
  pessoasAutuadasAIA: number;
  pessoasPresas: number;
  pessoasForagidas: number;
  armasFogoApreendidas: number;
  armasBrancasApreendidas: number;
  municoesApreendidas: number;
  entorpecentesApreendidos: string;
  embarcacoesVistoriadas: number;
  embarcacoesApreendidas: number;
  veiculosVistoriados: number;
  veiculosApreendidos: number;
  veiculosRecuperados: number;
  horasPoliciamentoNautico: string;
}
