import { Hct, MaterialDynamicColors, SchemeTonalSpot, argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'
import { appendFileSync, unlinkSync, existsSync } from 'fs'
import { styles } from '@material/web/typography/md-typescale-styles.js'

// Fancy shmancy color theming

// Get the theme from a hex color - just add your hex color here
const primaryColor = '#005260'
const cssPath = './src/theme.css' // Will be overwritte if it exist

if (existsSync(cssPath)) {
  console.log('Css file already exists, deleting')
  unlinkSync(cssPath)
}

// Line handling
const tab = '\t'
let tabs = 0
/**
 *
 * @param {string} line
 */
const addLine = (line) => {
  if (!line) {
    appendFileSync(cssPath, '\n')
    return
  }
  if (line.trim().endsWith('}')) {
    tabs--
  }
  appendFileSync(cssPath, `${tab.repeat(tabs)}${line}\n`)
  if (line.trim().endsWith('{')) {
    tabs++
  }
}

console.log(`Generating light scheme from color: ${primaryColor}`)
const lightScheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(primaryColor)), 0, 0)
console.log('Creating light mode css-variables in :root')
addLine('@media (prefers-color-scheme: light) {')
addLine(':root {')

for (const val of Object.values(MaterialDynamicColors)) {
  if (typeof val.getArgb === 'function') {
    const cssName = val.name.replaceAll('_', '-')
    const hexValue = hexFromArgb(val.getArgb(lightScheme))
    addLine(`--md-sys-color-${cssName}: ${hexValue};`)
  }
}

addLine('}')
addLine('}')
addLine()
console.log('Finished creating light theme')

console.log(`Generating dark scheme from color: ${primaryColor}`)
const darkScheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(primaryColor)), 1, 0)
console.log('Creating dark mode css-variables in :root')
addLine('@media (prefers-color-scheme: dark) {')
addLine(':root {')

for (const val of Object.values(MaterialDynamicColors)) {
  if (typeof val.getArgb === 'function') {
    const cssName = val.name.replaceAll('_', '-')
    const hexValue = hexFromArgb(val.getArgb(darkScheme))
    addLine(`--md-sys-color-${cssName}: ${hexValue};`)
  }
}

addLine('}')
addLine('}')
addLine()
console.log('Finished creating dark theme')

console.log('Generating typography')
const typographyCss = styles.cssText
let result = ''
let newLine = false
for (let i = 0; i < typographyCss.length; i++) {
  const current = typographyCss.charAt(i)
  const previous = typographyCss.charAt(i - 1) || null
  let charsToAdd = newLine ? `${tab.repeat(tabs)}${current}` : current
  newLine = false
  if ([':'].includes(current)) charsToAdd += ' ' // add whitespace
  if (current === '{') {
    charsToAdd = newLine ? `${tab.repeat(tabs)} ${current}\n` : ` ${current}\n`
    newLine = true
    tabs++
  }
  if (current === '}') {
    tabs--
    if (previous === '}') {
      charsToAdd = `${tab.repeat(tabs)}${current}\n`
    } else {
      charsToAdd = `\n${tab.repeat(tabs)}${current}\n`
    }
    newLine = true
  }
  result += charsToAdd
}
appendFileSync(cssPath, result)
console.log('Finished adding typography')
