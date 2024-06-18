<script>
  import '../app.css' // Add global css (and make it hot reload)
  import '../theme.css' // Add theme css (and make it hot reload)
  import logo from '$lib/assets/logo.svg'
  import logoDarkmode from '$lib/assets/logo-darkmode.svg'
  import { page } from '$app/stores'
  import { navigating } from '$app/stores'

  /** @type {import('./$types').PageData} */
	export let data

  const isActiveRoute = (route, currentRoute) => {
    if (currentRoute === route) return true
    if (route.length > 1 && currentRoute.substring(0, route.length) === route) return true
    return false
  }

  const getPathLinks = (path) => {
    const parts = path.split('/')
    const pathLinks = [
      {
        name: 'Hjem',
        href: '/',
        addSlashBefore: false
      }
    ]
    let currentLink = ''
    for (const part of parts) {
      if (part === '') continue
      currentLink += `/${part}`
      pathLinks.push({
        name: part,
        href: currentLink,
        addSlashBefore: true
      })
    }
    return pathLinks
  }

  const sideMenuItems = [
    {
      title: 'Hjem',
      href: '/',
      icon: 'home'
    },
    {
      title: 'Elever',
      href: '/elever',
      icon: 'person'
    },
    {
      title: 'Klasser',
      href: '/klasser',
      icon: 'group'
    }
  ]

  // For handling open / close of userMenu
  let userMenu

</script>

<div class="layout">
  <div class="fakesidebartotakeupspace">
    <p>Jeg burde ikke synes</p>
  </div>
  <div class="sidebar">
    <a class="logoLink" href="/" style="position: relative;">
      <md-focus-ring inward style="--md-focus-ring-shape: 8px"></md-focus-ring>
      <img class="logo" src={logo} alt="Fylkekommunens logo" />
      <img class="logoDarkmode" src={logoDarkmode} alt="Fylkekommunens logo" />
    </a>
    <md-divider role="separator"></md-divider>
    {#each sideMenuItems as menuItem}
      <a href={menuItem.href} class="menuLink" style="position: relative;">
        <md-focus-ring inward style="--md-focus-ring-shape: 8px"></md-focus-ring>
        <div class="menuItem{isActiveRoute(menuItem.href, $page.url.pathname) ? ' active' : ''}">
          <md-icon>{menuItem.icon}</md-icon>
          <div>{menuItem.title}</div>
        </div>
      </a>
      <md-divider role="separator"></md-divider>
    {/each}
  </div>
  <div class="pageContent">
    <div class="topbar">
      <h1 class="md-typescale-headline-large">Min Elev</h1>
      <div class="userContainer">
        <p class="md-typescale-body-large">{data.user.name}</p>
        <!-- Note the position: relative style -->
        <span style="position: relative;">
          <md-icon-button on:click={userMenu.open = !userMenu.open} id="usage-anchor"><md-icon>more_vert</md-icon></md-icon-button>
          <md-menu bind:this={userMenu} id="usage-menu" yOffset="-20px" anchor="usage-anchor">
            <md-menu-item disabled>
              <div slot="headline">{data.user.name}</div>
            </md-menu-item>
            <md-divider role="separator" tabindex="-1"></md-divider>
            <md-menu-item>
              <div slot="headline">Banana</div>
            </md-menu-item>
            <md-menu-item>
              <div slot="headline">Cucumber</div>
            </md-menu-item>
          </md-menu>
        </span>
      </div>
    </div>
    <md-divider role="separator"></md-divider>
    <div class="pathtracker">
      {#each getPathLinks($page.url.pathname) as pathlink}
        {#if pathlink.addSlashBefore}
          <span>/</span>
        {/if}
        <a class="pathtrackerlink md-typescale-label-large" style="position: relative;" href="{pathlink.href}">
          <md-focus-ring style="--md-focus-ring-shape: 8px"></md-focus-ring>
          {pathlink.name}
        </a>
      {/each}
    </div>
    <div class="contentContainer">
      <div class="content">
        {#if $navigating}
          <md-circular-progress indeterminate></md-circular-progress>
        {/if}
        <slot></slot>
      </div>
    </div>
  </div>
</div>


<style>
  .layout {
    display: flex;
  }
  .fakesidebartotakeupspace, .sidebar {
    width: 130px;
    flex-direction: column;
    flex-shrink: 0;
    align-items: center;
    padding: 20px 0px;
    display: flex;
    height: 100vh;
    background-color: var(--md-sys-color-surface-container);
  }
  .sidebar {
    position: fixed;
  }
  .logoLink {
    all: unset;
    margin-bottom: 32px;
  }
  .logo, .logoDarkmode {
    width: 130px;
  }
  @media (prefers-color-scheme: light) {
    .logoDarkmode {
      display: none;
    }
  }
  @media (prefers-color-scheme: dark) {
    .logo {
      display: none;
    }
  }
  .menuLink {
    all: unset;
  }
  .menuItem {
    width: 130px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0px;
    cursor: pointer;
  }
  .menuItem.active {
    font-weight: bold;
    color: var(--md-sys-color-on-surface);
    background-color: var(--md-sys-color-on-secondary);
  }
  .menuItem:hover {
    background-color: var(--md-sys-color-outline-variant);
  }
  .pageContent {
    flex-grow: 1;
    max-width: 1280px;
    margin: 0px auto;
    padding: 0px;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0px 32px;
    border-radius: 32px;
  }
  .pathtracker {
    display: flex;
    padding: 4px 32px;
  }
  .pathtrackerlink {
    padding: 0px 4px;
    text-decoration: none;
  }
  .userContainer {
    display: flex;
    align-items: center;
  }
  .contentContainer {
    padding: 16px 64px;
    /*background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface-container);*/
  }
  .content {
    margin: 0px auto 0px auto;
  }
</style>