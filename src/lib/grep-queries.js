// Qureies for Grep kan testes her: https://sparql-beta-data.udir.no/sparql

export const utdanningsprogramQuery = () => {
  return `
        prefix u: <http://psi.udir.no/ontologi/kl06/>
        prefix d: <http://psi.udir.no/kl06/>
        prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?up_kode ?up_uri ?up_url_data ?up_tittel ?up_type ?up_type_beskrivelse ?up_type_url_data WHERE {
            ?up rdf:type u:utdanningsprogram ;
                u:uri ?up_uri ;
                u:url-data ?up_url_data ;
                u:kode ?up_kode ;
                u:tittel ?up_tittel ;
                u:type-utdanningsprogram ?up_type ;
                u:status ?up_status .

            ?up_type u:beskrivelse ?up_type_beskrivelse ;
                u:url-data ?up_type_url_data .

            # FILTER (lang(?up_type_beskrivelse) = "default")
            FILTER regex(str(?up_status), "publisert", "i")
        }
    `
}

export const programomraaderQuery = (utdanningsprogramKode, aarstrinn) => {
  if (!utdanningsprogramKode) throw new Error('Missing required parameter: utdanningsprogramKode')
  const aarstrinnQuery = aarstrinn ? `u:aarstrinn d:${aarstrinn} ;` : ''
  return `
        prefix u: <http://psi.udir.no/ontologi/kl06/>
        prefix d: <http://psi.udir.no/kl06/>
        prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?po_tittel ?po_uri ?po_url_data ?po_kode ?trinn_kode ?po_o_sted WHERE {
        
            ?po rdf:type u:programomraade ;
                u:uri ?po_uri ;
                u:tittel ?po_tittel ;
                u:url-data ?po_url_data ;
                u:kode ?po_kode ;
                u:utdanningsprogram-referanse d:${utdanningsprogramKode} ;
                ${aarstrinnQuery}
                u:aarstrinn ?trinn ;
                u:opplaeringssted ?po_o_sted ;
                u:status ?po_status .

            ?trinn u:kode ?trinn_kode .

            FILTER regex(str(?po_status), "publisert", "i")
        }
    `
}

export const kompetansemaalQuery = (programomraadeKode) => {
  if (!programomraadeKode) throw new Error('Missing required parameter: programomraadeKode')
  return `
        prefix u: <http://psi.udir.no/ontologi/kl06/>
        prefix d: <http://psi.udir.no/kl06/>
        prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?km_tittel ?km_uri ?km_url_data ?km_kode ?po WHERE {
        
            ?km rdf:type u:kompetansemaal_lk20 ;
                u:uri ?km_uri ;
                u:tilhoerer-kompetansemaalsett/u:etter-fag/u:programomraader-referanse d:${programomraadeKode} ;
                u:tittel ?km_tittel ;
                u:url-data ?km_url_data ;
                u:kode ?km_kode ;
                u:status ?km_status .

            FILTER regex(str(?km_status), "publisert", "i")
        }
    `
}

export const programFagKompetansemaalQuery = (programomraadeKode) => {
  if (!programomraadeKode) throw new Error('Missing required parameter: programomraadeKode')
  return `
          prefix u: <http://psi.udir.no/ontologi/kl06/>
          prefix d: <http://psi.udir.no/kl06/>
          prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  
          SELECT DISTINCT ?km_tittel ?km_uri ?km_url_data ?km_kode ?po WHERE {
          
              ?km rdf:type u:kompetansemaal_lk20 ;
                  u:uri ?km_uri ;
                  u:tilhoerer-kompetansemaalsett/u:etter-fag/u:programomraader-referanse d:${programomraadeKode} ;
                  u:tilhoerer-laereplan/u:fagtype ?fagtype ;
                  u:tittel ?km_tittel ;
                  u:url-data ?km_url_data ;
                  u:kode ?km_kode ;
                  u:status ?km_status .
  
              FILTER regex(str(?km_status), "publisert", "i")
              FILTER regex(str(?fagtype), "programfag", "i")
          }
      `
}
