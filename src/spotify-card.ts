import {
  LitElement,
  html,
  customElement,
  property,
  internalProperty,
  CSSResult,
  TemplateResult,
  css,
} from 'lit-element';

import { HomeAssistant, LovelaceCardEditor, getLovelace, LovelaceCard } from 'custom-card-helpers';
import { servicesColl, subscribeEntities, HassEntities } from 'home-assistant-js-websocket';

import './editor';
import { PLAYLIST_TYPES, DISPLAY_STYLES } from './editor';
import './spotcast-connector';

import { SpotifyCardConfig } from './types';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';
import { SpotcastConnector } from './spotcast-connector';

//Display card verion in console
/* eslint no-console: 0 */
console.info(
  `%c  SPOTIFY-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

//Configures the preview in the Lovelace card picker
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'spotify-card',
  name: 'Spotify Card',
  //TODO: check description
  description: 'A custom card for displaying Spotify-Playlist and starting playback',
  preview: true,
});

@customElement('spotify-card')
export class SpotifyCard extends LitElement {
  //Calls the editor
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('spotify-card-editor') as LovelaceCardEditor;
  }

  //Returns default config for Lovelace picker
  public static getStubConfig(): Record<string, unknown> {
    return { playlist_type: '' };
  }

  @property({ type: Object })
  public hass!: HomeAssistant;
  @property({ type: Object })
  public config!: SpotifyCardConfig;
  @internalProperty()
  private spotcast_connector!: SpotcastConnector;

  //Private variables
  private spotcast_installed = false;
  private spotify_installed = false;
  private spotify_state: any = {};

  connectedCallback(): void {
    super.connectedCallback();
    this.spotcast_connector = new SpotcastConnector(this);
    //Check for installed spotcast
    if (servicesColl(this.hass.connection).state.spotcast !== undefined) {
      this.spotcast_installed = true;
    }
    subscribeEntities(this.hass.connection, (entities) => this.entitiesUpdated(entities));
  }

  //Get current played playlist
  entitiesUpdated(entities: HassEntities): void {
    for (const item in entities) {
      if (item.startsWith('media_player.spotify_')) {
        this.spotify_installed = true;
        this.spotify_state = entities[item];
        console.log(entities[item]);
        this.requestUpdate();
      }
    }
  }

  public setConfig(_config: SpotifyCardConfig): void {
    let var_error = '';
    if (_config.limit && !(typeof _config.limit === 'number')) {
      var_error = 'limit';
    }
    if (_config.playlist_type && !PLAYLIST_TYPES.includes(_config.playlist_type)) {
      var_error = 'playlist_type';
    }
    if (_config.country_code && !(typeof _config.country_code === 'string')) {
      var_error = 'country_code';
    }
    if (_config.height && !(typeof _config.height === 'number')) {
      var_error = 'height';
    }
    if (_config.display_style && !DISPLAY_STYLES.includes(_config.display_style)) {
      var_error = 'display_style';
    }
    if (_config.darkmode && !(typeof _config.darkmode === 'boolean')) {
      var_error = 'darkmode';
    }

    //Error test mode
    if (_config.show_error || var_error != '') {
      throw new Error(localize('common.invalid_configuration') + var_error);
    }

    //Convenience mode
    if (_config.test_gui) {
      getLovelace().setEditMode(true);
    }

    //TODO change spotify icon based on selected theme. Problem: only black and white spotify icon is allowed
    let spotify_icon = '../local/community/spotify-card/img/Spotify_Logo_RGB_Black.png';
    if (_config.dark_mode) {
      spotify_icon = '../local/community/spotify-card/img/Spotify_Logo_RGB_White.png';
    }
    this.config = {
      spotify_icon,
      ..._config,
    };
  }

  protected render(): TemplateResult | void {

    let warning = html``;
    if (this.config.show_warning) {
      warning = this.showWarning(localize('common.show_warning'));
    }
    if (!this.spotcast_installed) {
      warning = this.showWarning(localize('common.show_missing_spotcast'));
    }

    if (!this.spotify_installed) {
      warning = this.showWarning(localize('common.show_missing_spotify'));
    }

    //Display loading screen if no content available yet
    let content = html`<div>loading</div>`;
    if (!this.spotcast_connector.is_loading() && this.spotcast_installed) {
      this.spotcast_connector.fetchPlaylists(this.config.limit ? this.config.limit : 10);
    } else {
      //TODO add grid view
      content = this.generatePlaylistHTML();
    }

    const device_list = html`
      <div class="dropdown-content">
        <p>Spotify Connect devices</p>
        <a href="#">Spotify</a>
        <a href="#">Spotify</a>
        <a href="#">Spotify</a>
        <a href="#">Spotify</a>
        <a href="#">Spotify</a>
        <p>Chromecast devices</p>
        <a href="#">Chromecast</a>
        <a href="#">Chromecast</a>
        <a href="#">Chromecast</a>
      </div>
    `;

    return html`
      <ha-card tabindex="0" style="${this.config.height ? `height: ${this.config.height}px` : ``}"
        >${this.config.hide_warning ? '' : warning}
        <div id="header">
          <div id="icon"><img src=${this.config.spotify_icon} /></div>
          ${this.config.name ? html`<div id="header_name">${this.config.name}</div>` : ''}
          <div></div>
        </div>
        <div id="content">
          ${content}
        </div>
        <div id="footer">
          <div class="dropdown-wrapper">
            <div class="controls">
              <div class="dropdown">
                <div class="mediaplayer_select">
                  <svg
                    class="mediaplayer_speaker_icon"
                    width="220"
                    height="220"
                    viewBox="0 0 220 220"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M197.766 112.275q0 56.608-34.867 105.006l-8.157-6.984q32.743-44.355 32.743-98.022 0-52.565-32.632-97.9l8.158-6.984q34.755 48.398 34.755 104.884zm-24.586 0q0 46.928-28.831 88.22l-8.158-6.74q26.708-38.228 26.708-81.48 0-43.13-26.708-81.359l8.158-6.74q28.831 40.435 28.831 88.099zm-24.585 0q0 37.126-22.908 71.434l-8.27-6.617q20.897-30.632 20.897-64.817 0-33.573-20.897-64.818l8.27-6.616q22.908 34.308 22.908 71.434zm-54.646 89.2l-52.634-53.3H8.125V76.374h33.302l52.522-53.177v178.278z"
                      stroke="null"
                    />
                  </svg>
                  Current selected Device
                </div>
              </div>
            </div>
            ${device_list}
          </div>
        </div>
      </ha-card>
    `;
  }

  public generatePlaylistHTML(): TemplateResult {
    if (this.spotcast_connector.is_loaded()) {
      const result: TemplateResult[] = [];
      for (let i = 0; i < this.spotcast_connector.playlists.length; i++) {
        const item = this.spotcast_connector.playlists[i];
        let iconPlay = '';
        let iconShuffle = '';
        if (this.spotify_state.attributes.media_playlist === item.name) {
          iconPlay = 'playing';
          iconShuffle = this.spotify_state.attributes.shuffle ? 'playing' : '';
        }
        result.push(html`<div class="list-item">
          <img src="${item.images[item.images.length - 1].url}" />
          <div class="icon ${iconPlay}">
            <svg width="24" height="24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div class="icon ${iconShuffle}">
            <svg width="24" height="24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
              />
            </svg>
          </div>
          <p>${item.name}</p>
        </div>`);
      }
      return html`<div>${result}</div>`;
    }
    return html``;
  }

  private showWarning(warning: string): TemplateResult {
    return html`<hui-warning>${warning}</hui-warning>`;
  }

  private showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card') as LovelaceCard;
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        ha-card {
          --header-height: 4em;
          --footer-height: 3.5em;
          padding-left: 0.5em;
          padding-right: 0.5em;
        }

        #header {
          display: flex;
          height: var(--header-height);
        }
        #header > * {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #content {
          height: calc(100% - var(--header-height) - var(--footer-height));
          border: solid 2px var(--divider-color);
          border-radius: 0.2em;
          overflow: auto;
          padding: 0.2em;
        }

        #icon {
          justify-content: left;
          padding-left: 0.5em;
        }

        #icon img {
          width: 100px;
        }

        #header_name {
          font-size: x-large;
        }

        #footer {
          height: var(--footer-height);
        }

        .controls {
          padding: 0.5em;
        }

        .dropdown {
          position: relative;
          display: inline-block;
        }

        .mediaplayer_select {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mediaplayer_speaker_icon {
          display: inline-block;
          padding: 3px;
          width: 17px;
          height: 17px;
          margin-right: 10px;
          border: thin solid var(--primary-text-color);
          border-radius: 50%;
        }

        .mediaplayer_speaker_icon > path {
          fill: var(--primary-text-color);
        }

        .dropdown-wrapper {
          display: contents;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
        }

        .dropdown-content {
          display: none;
          position: absolute;
          left: 1em;
          bottom: 0.5em;
          max-height: calc(100% - 2em);
          overflow-y: auto;
          background-color: var(--card-background-color);
          min-width: 250px;
          box-shadow: var(--primary-text-color) 0 0 16px 0px;
          z-index: 1;
        }

        .dropdown-content p {
          font-weight: bold;
          padding: 0.5em;
          line-height: 1.5em;
          margin: 0;
        }
        
        .dropdown-content a {
          color: var(--primary-text-color);
          padding: 12px 16px;
          text-decoration: none;
          display: block;
        }
        .dropdown-content a:hover {
          box-shadow: inset 0 0 100px 100px var(--secondary-background-color);
        }
        .controls:hover + .dropdown-content,
        .dropdown-content:hover {
          display: block;
        }
      `,
      SpotifyCard.listStyles,
    ];
  }

  static listStyles = css`
    ha-card {
      --list-item-height: 3em;
      --spotify-color: #1db954;
    }

    .list-item {
      /* height: var(--list-item-height); */
      align-items: center;
      border-bottom: solid var(--divider-color) 1px;
      display: flex;
    }

    .list-item:last-of-type {
      border-bottom: 0;
    }

    .list-item > img {
      height: var(--list-item-height);
      object-fit: contain;
    }

    .list-item > .icon {
      height: var(--list-item-height);
      width: var(--list-item-height);
      min-height: var(--list-item-height);
      min-width: var(--list-item-height);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .list-item > .icon > svg  {
      fill: var(--primary-text-color);

    .list-item > .icon.playing {
      fill: var(--primary-color);
    }

    .list-item > p {
      margin: 0 0.5em 0 0.5em;
    }
  `;

  static litIconSet = html` <lit-iconset iconset="iconset">
    <svg>
      <defs>
        <g id="play">
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M8 5v14l11-7z" />
        </g>
      </defs>
    </svg>
  </lit-iconset>`;
}
