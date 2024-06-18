<script>
  import '../app.css' // Add global css (and make it hot reload)
  import logo from '$lib/assets/logo.svg'
  import logoDarkmode from '$lib/assets/logo-darkmode.svg'
  import { page } from '$app/stores'
  import { navigating } from '$app/stores'
  import { clickOutside } from '$lib/helpers/click-outside'

  /** @type {import('./$types').PageData} */
	export let data

  let showUsermenu = false

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
    <a class="logoLink" href="/">
      <img class="logo" src={logo} alt="Fylkekommunens logo" />
      <img class="logoDarkmode" src={logoDarkmode} alt="Fylkekommunens logo" />
    </a>
    <!--<md-divider role="separator"></md-divider>-->
    {#each sideMenuItems as menuItem}
      <a href={menuItem.href} class="menuLink">
        <div class="menuItem{isActiveRoute(menuItem.href, $page.url.pathname) ? ' active' : ''}">
          <span class="material-symbols-outlined">{menuItem.icon}</span>
          <div>{menuItem.title}</div>
        </div>
      </a>
      <!--<md-divider role="separator"></md-divider>-->
    {/each}
  </div>
  <div class="pageContent">
    <div class="topbar">
      <h1>Min Elev</h1>
      <div class="userContainer">
        <p>{data.user.name}</p>
        <!-- Note the position: relative style -->
        <button class="action{showUsermenu ? ' cheatActive' : ''}" on:click={() => {showUsermenu = !showUsermenu}} use:clickOutside on:click_outside={() => {showUsermenu = false}}>
          <span class="material-symbols-outlined">more_vert</span>
          {#if showUsermenu}
            <div class="userMenu">
              <button class="blank userMenuOption">Logg ut</button>
              <button class="blank userMenuOption">Huoo</button>
              <button class="blank userMenuOption">Hepp</button>
            </div>
          {/if}
        </button>
      </div>
    </div>
    <!--<md-divider role="separator"></md-divider>-->
    <div class="pathtracker">
      {#each getPathLinks($page.url.pathname) as pathlink}
        {#if pathlink.addSlashBefore}
          <span>/</span>
        {/if}
        <a class="pathtrackerlink" href="{pathlink.href}">
          {pathlink.name}
        </a>
      {/each}
    </div>
    <div class="contentContainer">
      <div class="content">
        {#if $navigating}
          LASTER (bytt meg ut med en spinner om du vil)
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
    background-color: var(--secondary-color-20);
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
    background-color: var(--secondary-color-10);
  }
  .menuItem:hover {
    background-color: var(--secondary-color-30);
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
    border-bottom: 2px solid var(--primary-color);
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
    position: relative;
  }

  .cheatActive {
    background-color: rgba(0,0,0,0.1);
  }

  .userMenu {
    position: absolute;
    display: flex;
    flex-direction: column;
    right: 2px;
    top: 54px;
    border: 2px solid var(--primary-color);
  }
  .userMenuOption {
    flex-grow: 1;
    padding: 16px;
    background-color: var(--primary-background-color);
  }
  .userMenuOption:hover {
    padding: 16px;
    background-color: var(--primary-color-10);
  }

  .contentContainer {
    padding: 16px 64px;
  }
  .content {
    margin: 0px auto 0px auto;
  }
</style>