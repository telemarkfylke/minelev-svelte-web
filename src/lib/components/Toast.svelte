<script>
  export let status = "success"
  export let toastTitle = "Suksess 👍"
  export let toastMessage = "Dokumentet er lagret og lagt til i køen. Sender deg tilbake til elevsiden."
</script>

<div class="toast {status}">
  <h4 class="toastTitle">{toastTitle}</h4>
  {toastMessage}
</div>

<style>
  .toast {
    max-width: 20rem;
    border: 2px solid var(--success-color);
    border-right: 0px solid var(--success-color);
    position: fixed;
    top: 5rem;
    right: -22rem;
    z-index: 200;
    padding: 2rem 3rem 2rem 2rem;
    -webkit-animation: slide 0.5s forwards;
    animation: slide 0.5s forwards;
  }
  .toastTitle {
    margin: 0rem; 
  }
  .success {
    background-color: var(--success-background-color);
  }

  @-webkit-keyframes slide {
      100% { right: 0; }
  }

  @keyframes slide {
      100% { right: 0; }
  }
</style>