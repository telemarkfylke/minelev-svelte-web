export const isValidMobile = (mobile = '') =>
  mobile.trim()
    .replace(/ /g, '')
    .replace(/^\+47/, '')
    .replace(/^0047/, '')
    .replace(/[^0-9]/g, '')
    .length === 8

export const isValidEmail = (email = '') =>
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)

export const validateContent = (content, contentValidator) => {
  const resultArray = []

  validateObject(content, contentValidator, resultArray)

  return { valid: resultArray.length === 0, result: resultArray }
}

const validateObject = (content, contentValidator, resultArray, parentKey = '') => {
  if (typeof content !== 'object') return // Okey dokey
  if ((typeof content !== typeof contentValidator) || Array.isArray(content) !== Array.isArray(contentValidator)) { // Hvis ikke typen er lik på rot
    resultArray.push({ [`${parentKey || 'content'}`]: 'wrong type' })
    return
  }
  try {
    for (const [key, value] of Object.entries(content)) {
      if (!Array.isArray(content) && contentValidator[key] === undefined) { // Hvis ikke array, og proppen ikke finnes i validatoren
        resultArray.push({ [`${parentKey}${key}`]: 'extra' })
        continue
      }
      if (typeof contentValidator[Array.isArray(contentValidator) ? '0' : key] !== typeof value) { // Hvis typen til nåværende element ikke matcher typen til matchende element i validatoren
        resultArray.push({ [`${parentKey}${key}`]: `wrong type (need ${typeof contentValidator[Array.isArray(contentValidator) ? '0' : key]}, got ${typeof value})`})
        continue
      }
      if (typeof content[key] === 'object' && content[key]) {
        validateObject(content[key], contentValidator[Array.isArray(contentValidator) ? '0' : key], resultArray, `${parentKey}${key}.`)
      }
    }
    for (const key of Object.keys(contentValidator)) {
      if (contentValidator[key] === 'optional') continue
      if (content[key] === undefined) {
        resultArray.push({ [`${parentKey}${key}`]: 'missing' })
        continue
      }
    }
  } catch (error) {
    console.log('tryna i validering')
    console.log(JSON.stringify(content))
    console.log(error)
    throw error
  }
}

/*
const contentMan = {
  year: '2023/2024',
  period: {
    id: '02',
    nb: 'Halvårsvurdering 2. termin',
    nn: 'Halvårsvurdeiring 2. termin',
    en: 'Halvårsvurdering 2. termin'
  },
  classes: [
    {
      id: '9384395',
      name: 'STB3/KODD2789',
      schoolId: '234545',
      nb: 'Fagets navn',
      nn: 'Fagets namn',
      en: "jfdifjod"
    }
  ],
  reasons: [
    {
      id: '01',
      nb: 'en grunn',
      nn: 'ein grunn',
      en: 'a reason'
    }
  ]
}

const contentManValida = {
  year: '2023/2024',
  period: {
    id: '02',
    nb: 'Halvårsvurdering 2. termin',
    nn: 'Halvårsvurdeiring 2. termin',
    en: 'Halvårsvurdering 2. termin'
  },
  classes: [
    {
      id: '9384395',
      name: 'STB3/KODD2789',
      schoolId: '234545',
      nb: 'Fagets navn',
      nn: 'Fagets namn',
      en: 'Course name'
    }
  ],
  reasons: [
    {
      id: '01',
      nb: 'en grunn',
      nn: 'ein grunn',
      en: 'a reason',
    }
  ]
}

const validation = validateContent(contentMan, contentManValida)
console.log(validation)

*/
