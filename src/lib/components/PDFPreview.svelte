<script>
  import { error } from "@sveltejs/kit";

  export let getDataFunction
  export let showPreview = false
  export let closePreview = () => {
    showPreview = false
  }
  
  let previewModal

  const b64toBlob = async (base64, type = 'application/octet-stream') => {
    return (await fetch(`data:${type};base64,${base64}`)).blob()
  }

  const getPdfPreview = async () => {
    /* HVA ER GALT MED MEG??? */
    const pdfData = getDataFunction()

    console.log(pdfData)

    const pdfPreview = await fetch('?/preview', {
      method: 'POST',
      body: JSON.stringify(pdfData)
    })
    const result = await pdfPreview.json()
    if (!result.status === 'success') {
      throw error('Feielleel')
    }
    const base64 = JSON.parse(result.data)[0]
    const blob = await b64toBlob(base64, 'application/pdf')
    return blob
  }

  $: if (showPreview) previewModal.showModal()

</script>

<dialog bind:this={previewModal}>
  <form method="dialog">
      <div class="modalTitle">
          <h2>Forhåndsvisning</h2>
          <button on:click={closePreview} title="Lukk modal"><span class="material-symbols-outlined">close</span>Lukk</button>
      </div>
      <div class="rawData">
        {#if showPreview}
          {#await getPdfPreview()}
            Laster pdf...
          {:then pdfResponse}
              <object aria-label="PDF preview" class="pdf-preview" data='{URL.createObjectURL(pdfResponse)}'>
                <p>Din nettleser støtter ikke PDF-visning</p>
                <p>
                  Last ned filen <a href="{URL.createObjectURL(pdfResponse)}" download="preview.pdf">her</a>
                </p>
              </object>
          {:catch err}
            Feila
            {err.message}
            <pre>{JSON.stringify(err, null, 2)}</pre>
          {/await}
        {/if}
      </div>
      <!--<pre>{JSON.stringify(test.result.raw, null, 2)}</pre>-->
  </form>
</dialog>

<style>
  object {
    width: 100%;
    min-height: 50rem;
  }
  dialog {
    width: 80vw;
    height: 80vh;
    margin: auto;
    border: none;
    padding: 32px
  }
  dialog::backdrop {
    background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7));
    animation: fade-in 1s;
  }
  .modalTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>