# Install or update the YCS controller

The controller and graphics are separate Git repositories. Merge/release their
changes separately and deploy matching revisions. The current feature branches
are `ycs-spx:codex/field-data-links` and `ycs-graphics:codex/ticker-playlists`.
The controller's default branch is `master`; the graphics default is `main`.

## Local setup

Use Node.js 22 or newer and keep the checkouts side by side. Node 20.16 is also
supported by the test launcher, which enables its experimental WebSocket client.

```powershell
git clone https://github.com/tzarVOLVER/ycs-spx.git
git clone https://github.com/tzarVOLVER/ycs-graphics.git
Set-Location ycs-graphics
git switch codex/ticker-playlists
Set-Location ../ycs-spx
git switch codex/field-data-links
npm ci
npm run ycs:demo
./ycs/connect-graphics.ps1
./ycs/start-runtime.ps1
```

`connect-graphics.ps1` creates a Windows directory junction at
`ASSETS/templates/ycs` pointing to the existing graphics directory. It also sets
`ycs.graphicsRoot` in `.local/ycs-dev.json` to its ticker directory. No templates
are copied or moved. For another location, use
`./ycs/connect-graphics.ps1 -GraphicsRoot 'D:/ycs-graphics/graphics'`.
Use `-Config` for a different saved configuration. Stop SPX before changing its
paths and start it afterwards. The script accepts an existing matching junction
and refuses to replace a different folder or link.

Open Project Settings, browse into `ycs`, and import the desired HTML templates.
Then use Add item in the rundown. Keep `shared`, fonts and other assets beside
the templates. `graphicsRoot` serves development assets but does not itself make
them appear in the native picker. A packaged installation can instead extract
the graphics repository's SPX packages into `ASSETS/templates`.

Existing profiles and rundowns retain their imported template metadata. Updating
the graphics checkout alone does not upgrade those saved copies. Back up the
data directory, then re-import project templates and add fresh rundown items as
needed. Preserve existing items until saved values and mappings have been checked.

## LAN access and decktype images

Stop SPX, back up the saved configuration, and set these properties under `ycs`:

```json
{
  "listenHost": "0.0.0.0",
  "decktypeFolders": ["\\\\Graphics\\decktypes"]
}
```

Keep the remaining configuration fields. Restart using `start-runtime.ps1`.
On other computers, use `http://SERVER_LAN_IP:5660`, including for output URLs
and copied Companion commands. `localhost` refers to the computer opening it.
The SPX Windows account must be able to read the share. Clients fetch PNGs from
SPX's `/decktypes/NAME.png` route; they do not need SMB/share access themselves.
Only PNGs directly inside each configured folder are searched.

If Windows Firewall is enabled, allow inbound TCP 5660 for your trusted network.
An administrator can create a Private-network, local-subnet rule:

```powershell
New-NetFirewallRule -DisplayName 'YCS SPX LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5660 -Profile Private -RemoteAddress LocalSubnet
```

With login disabled, opening a controller or Data Manager creates an operator
session and allows LAN browser controls. Output-only sessions remain viewers.
Configure an SPX operator login when access should require credentials. Companion
requests without an operator session require `ycs.apiKey` and an
`Authorization: Bearer YOUR_KEY` header. Settings changes remain localhost-only;
open `http://127.0.0.1:5660/ycs/settings` on the server.

## Validation and release

Run `npm test` in the controller checkout. The launcher enumerates test files on
Windows and supplies the WebSocket flag for Node 20. Run the graphics tests and
contract checks in the graphics checkout too. Before venue use, verify controller
and output access from a second computer, decktype image loading, simultaneous
stage playback, Companion commands, and reconnection after a managed restart.

Commit and push source changes before opening a pull request. `.local/`, saved
credentials, machine-specific configuration and the local template junction are
not part of the merge. Repeat local setup on each SPX server; output clients only
need their HTTP URLs. Use `./ycs/stop-runtime.ps1` to stop the background runtime.
