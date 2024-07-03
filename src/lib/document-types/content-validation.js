export const validateContent = (content, contentValidator) => {
  const resultArray = []

  validateObject(content, contentValidator, resultArray)

  return { valid: resultArray.length === 0, result: resultArray }
}

const validateObject = (content, contentValidator, resultArray, parentKey='') => {
  if (typeof content !== 'object') return
  if ((typeof content !== typeof contentValidator) || Array.isArray(content) !== Array.isArray(contentValidator)) {
    resultArray.push({ [`${parentKey || 'content'}`]: 'wrong type' })
    return
  }
  try {
    for (const [key, value] of Object.entries(content)) {
      if (!Array.isArray(content) && contentValidator[key] === undefined) {
        resultArray.push({ [`${parentKey}${key}`]: 'extra' })
        continue
      }
      if (typeof contentValidator[Array.isArray(contentValidator) ? '0' : key] !== typeof value) {
        resultArray.push({ [`${parentKey}${key}`]: 'wrong type' })
        continue
      }
      if (typeof content[key] === 'object' && content[key]) {
        validateObject(content[key], contentValidator[Array.isArray(contentValidator) ? '0' : key], resultArray, `${parentKey}${key}.`)
      }
    }
    for (const [key, value] of Object.entries(contentValidator)) {
      if (content[key] === undefined) {
        resultArray.push({ [`${parentKey}${key}`]: 'missing' })
        continue
      }
    }
  } catch (error) {
    console.log('tryna i validering')
    console.log(JSON.stringify(content))
    console.log(error) 
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