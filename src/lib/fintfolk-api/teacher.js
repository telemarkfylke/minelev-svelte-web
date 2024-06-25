import { error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { getMsalToken } from '$lib/msal-token'
import { sleep } from '$lib/api'

const mockTeacher = {
  feidenavn: 'larer.laresen@fisfylke.no',
  ansattnummer: '12345678',
  upn: 'larer.laresen@fisfylke.no',
  navn: 'Lærer Læresen',
  fornavn: 'Lærer',
  etternavn: 'Læresen',
  fodselsnummer: '12345678911',
  fodselsdato: '1978-01-26T00:00:00Z',
  alder: 45,
  kjonn: '1',
  larerEpostadresse: 'larer.laresen@fisfylke.no',
  larerMobiltelefonnummer: null,
  kontaktEpostadresse: 'larer.laresen@fisfylke.no',
  kontaktMobiltelefonnummer: null,
  privatEpostadresse: null,
  privatMobiltelefonnummer: '12345678',
  bostedsadresse: {
    adresselinje: 'Lærergata 19',
    postnummer: '1234',
    poststed: 'SKOLESTEDET'
  },
  azureOfficeLocation: 'Mordor vgs',
  hovedskole: {
    navn: 'Mordor videregående skole',
    skolenummer: '12345'
  },
  undervisningsforhold: [
    {
      systemId: '26017341--1--20230512',
      beskrivelse: 'Lærer -',
      aktiv: true,
      arbeidsforhold: {
        arbeidsforholdstype: {
          kode: 'FA',
          navn: 'Fast ansatt'
        },
        gyldighetsperiode: {
          start: '2023-05-01T00:00:00Z',
          slutt: null,
          aktiv: true
        },
        arbeidsforholdsperiode: {
          start: '2019-08-01T00:00:00Z',
          slutt: null,
          aktiv: true
        },
        ansettelsesprosent: 6000,
        lonnsprosent: 6000
      },
      skole: {
        navn: 'Mordor videregående skole',
        kortnavn: 'OF-MRD',
        skolenummer: '12345',
        organisasjonsnummer: '974568023',
        organisasjonsId: '23',
        hovedskole: true
      },
      basisgrupper: [
        {
          navn: '2BU',
          systemId: '1472079',
          aktiv: true,
          trinn: 'VG2',
          skole: {
            navn: 'Mordor videregående skole',
            skolenummer: '12345',
            hovedskole: true
          },
          termin: [
            {
              kode: 'H1',
              gyldighetsperiode: {
                start: '2022-08-01T00:00:00Z',
                slutt: '2023-01-13T00:00:00Z',
                aktiv: false
              }
            },
            {
              kode: 'H2',
              gyldighetsperiode: {
                start: '2023-01-14T00:00:00Z',
                slutt: '2023-07-31T00:00:00Z',
                aktiv: true
              }
            }
          ],
          skolear: {
            kode: '20222023',
            gyldighetsperiode: {
              start: '2022-08-01T00:00:00Z',
              slutt: '2023-07-31T00:00:00Z',
              aktiv: true
            }
          },
          elever: [
            {
              navn: 'Elev Elevesen',
              fornavn: 'Elev',
              etternavn: 'Elevesen',
              feidenavn: 'ele0102@fisfylke.no',
              elevnummer: '1234567',
              kontaktlarer: true
            },
            {
              navn: 'Frodo Baggins',
              fornavn: 'Frodo',
              etternavn: 'Baggins',
              feidenavn: 'fro12345@fisfylke.no',
              elevnummer: '1234568',
              kontaktlarer: false
            }
          ]
        }
      ],
      kontaktlarergrupper: [
        {
          navn: '2BU',
          systemId: '1472079_461323',
          aktiv: true,
          skole: {
            navn: 'Mordor videregående skole',
            skolenummer: '12345',
            hovedskole: true
          },
          termin: [
            {
              kode: 'H1',
              gyldighetsperiode: {
                start: '2022-08-01T00:00:00Z',
                slutt: '2023-01-13T00:00:00Z',
                aktiv: false
              }
            },
            {
              kode: 'H2',
              gyldighetsperiode: {
                start: '2023-01-14T00:00:00Z',
                slutt: '2023-07-31T00:00:00Z',
                aktiv: true
              }
            }
          ],
          skolear: {
            kode: '20222023',
            gyldighetsperiode: {
              start: '2022-08-01T00:00:00Z',
              slutt: '2023-07-31T00:00:00Z',
              aktiv: true
            }
          }
        }
      ],
      undervisningsgrupper: [
        {
          navn: '2PI/KRO1018',
          systemId: '12041923',
          aktiv: true,
          fag: [
            {
              navn: 'Kroppsøving vg2',
              grepreferanse: [
                'https://psi.udir.no/kl06/KRO1018'
              ]
            }
          ],
          skole: {
            navn: 'Mordor videregående skole',
            skolenummer: '12345',
            hovedskole: true
          },
          termin: [
            {
              kode: 'H1',
              gyldighetsperiode: {
                start: '2022-08-01T00:00:00Z',
                slutt: '2023-01-13T00:00:00Z',
                aktiv: false
              }
            },
            {
              kode: 'H2',
              gyldighetsperiode: {
                start: '2023-01-14T00:00:00Z',
                slutt: '2023-07-31T00:00:00Z',
                aktiv: true
              }
            }
          ],
          skolear: {
            kode: '20222023',
            gyldighetsperiode: {
              start: '2022-08-01T00:00:00Z',
              slutt: '2023-07-31T00:00:00Z',
              aktiv: true
            }
          },
          elever: [
            {
              navn: 'Elev Elevesen',
              fornavn: 'Elev',
              etternavn: 'Elevesen',
              feidenavn: 'ele0102@fisfylke.no',
              elevnummer: '1234567',
              kontaktlarer: true
            },
            {
              navn: 'Frodo Baggins',
              fornavn: 'Frodo',
              etternavn: 'Baggins',
              feidenavn: 'fro12345@fisfylke.no',
              elevnummer: '1234568',
              kontaktlarer: false
            }
          ]
        }
      ]
    },
    {
      systemId: '26017341--1--20230513',
      beskrivelse: 'Lærer -',
      aktiv: true,
      arbeidsforhold: {
        arbeidsforholdstype: {
          kode: 'FA',
          navn: 'Fast ansatt'
        },
        gyldighetsperiode: {
          start: '2023-05-01T00:00:00Z',
          slutt: null,
          aktiv: true
        },
        arbeidsforholdsperiode: {
          start: '2019-08-01T00:00:00Z',
          slutt: null,
          aktiv: true
        },
        ansettelsesprosent: 6000,
        lonnsprosent: 6000
      },
      skole: {
        navn: 'Hobbittun videregående skole',
        kortnavn: 'OF-HOB',
        skolenummer: '12346',
        organisasjonsnummer: '974568024',
        organisasjonsId: '24',
        hovedskole: false
      },
      basisgrupper: [],
      kontaktlarergrupper: [],
      undervisningsgrupper: [
        {
          navn: '2STB/MAT1017',
          systemId: '120419232',
          aktiv: true,
          fag: [
            {
              navn: 'Mat og hobbiter vg2',
              grepreferanse: [
                'https://psi.udir.no/kl06/MAT1017'
              ]
            }
          ],
          skole: {
            navn: 'Hobbittun videregående skole',
            skolenummer: '12346',
            hovedskole: false
          },
          termin: [
            {
              kode: 'H1',
              gyldighetsperiode: {
                start: '2022-08-01T00:00:00Z',
                slutt: '2023-01-13T00:00:00Z',
                aktiv: false
              }
            },
            {
              kode: 'H2',
              gyldighetsperiode: {
                start: '2023-01-14T00:00:00Z',
                slutt: '2023-07-31T00:00:00Z',
                aktiv: true
              }
            }
          ],
          skolear: {
            kode: '20222023',
            gyldighetsperiode: {
              start: '2022-08-01T00:00:00Z',
              slutt: '2023-07-31T00:00:00Z',
              aktiv: true
            }
          },
          elever: [
            {
              navn: 'Sarumann Sauronsen',
              fornavn: 'Sarumann',
              etternavn: 'Sauronsen',
              feidenavn: 'sar0398@fisfylke.no',
              elevnummer: '1234569',
              kontaktlarer: false
            },
            {
              navn: 'Frodo Baggins',
              fornavn: 'Frodo',
              etternavn: 'Baggins',
              feidenavn: 'fro12345@fisfylke.no',
              elevnummer: '1234568',
              kontaktlarer: false
            },
            {
              navn: 'Elev Elevesen',
              fornavn: 'Elev',
              etternavn: 'Elevesen',
              feidenavn: 'ele0102@fisfylke.no',
              elevnummer: '1234567',
              kontaktlarer: false
            }
          ]
        }
      ]
    }
  ]
}

/*
function makeid (length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

for (let i = 0; i < 100; i++) {
  mockTeacher.undervisningsforhold[0].undervisningsgrupper[0].elever.push(
    {
      navn: makeid(5),
      fornavn: 'Frodo',
      etternavn: 'Baggins',
      feidenavn: 'fro12345@domene.no',
      elevnummer: makeid(5),
      kontaktlarer: false
    }
  )
}
*/
/**
 *
 * @param {Object} user
 */
export const fintTeacher = async (user) => {
  const identifier = user.feidenavn || user.principalName
  if (!identifier) throw error(400, 'Missing required parameter "user.feidenavn" or "user.principalName"')
  if (env.MOCK_API === 'true' && env.NODE_ENV !== 'production') {
    await sleep(1000)
    return mockTeacher
  }
  const accessToken = await getMsalToken({ scope: 'fint-folk-scope' }) // Change to env!
  return accessToken
}
