import { SpotifyCard } from './spotify-card';

interface Message {
  type: string,
  playlist_type: string,
  country_code?: string,
}

export class SpotcastConnector {
  playlists: any = {};

  parent: SpotifyCard;

  loading = false;

  constructor(parent: SpotifyCard) {
    this.parent = parent;
  }

  public is_loading(): boolean {
    setTimeout(this.set_loading_off, 100);
    return this.loading;
  }

  private set_loading_off() {
    this.loading = false;
  }

  public is_loaded(): boolean {
    if (this.playlists.length !== undefined) {
      return true;
    }
    return false;
  }

  public fetchPlaylists(limit: number): void {
    console.log(limit);
    this.loading = true;
    const message: Message = {
      type: 'spotcast/playlists',
      playlist_type: this.parent.config.playlist_type ? this.parent.config.playlist_type : '', 
    };
    if (this.parent.config.country_code) {
      message.country_code = this.parent.config.country_code;
    }
    this.parent.hass.connection
      .sendMessagePromise(message)
      .then(
        (resp: any) => {
          console.log('Message success!', resp.items);
          this.playlists = resp.items;
          this.parent.requestUpdate();
        },
        (err) => {
          console.error('Message failed!', err);
        },
      );
  }
}
