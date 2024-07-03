export const objectToFormdata = (obj) => {
  const formData = new FormData()
  
  buildFormData(formData, obj)
  
  return formData
}

const buildFormData = (formData, data, parentKey) => {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}` : key)
    })
  } else {
    const value = data == null ? '' : data
    formData.append(parentKey, value)
  }
}