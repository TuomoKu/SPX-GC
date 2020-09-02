# SPX-GC Template Demo Pack #1



This starter pack consists of a few example HTML -templates to be used for testing [**SPX Graphics Controller**](https://www.github.com/TuomoKu/SPX-GC/) for controlling [CasparCG](https://casparcg.com/) or streaming applications, such as [OBS](https://obsproject.com/), [Wirecast](https://www.telestream.net/wirecast/) and [vMix](https://www.vmix.com/).

Custom made and branded templates should always be used in production but these might help while getting to know the system


## Installation
 - Install **SPX Graphics Controller** from [smartpx.fi/gc](http://smartpx.fi/gc) if not installed.
 - Download [spx_template_pack_1.zip](http://smartpx.fi/gc/spx_template_pack_1.zip) -file and unzip to your GC's __templates__ -folder.
 - in GC, open a project and import demo templates into it.
 - open any rundown in that project and add templates to rundown.
 - fill in the templates and play.

## List of templates
The pack has 8 templates. Some of them demonstrates various aspects of GC features.
| Template | Features |
| ------ | ------ |
| COLOR BUMPER | A basic color wipe. Uses "none" as __out-mode__ |
| HEADLINE 2 STEPS | Animation has two phases: play > **continue** > stop |
| INFO LEFT | Template has a **dropdown control** for choosing an animated icon |
| INFO RIGHT | Basic oneliner |
| NAME LEFT | Name strap with optional fields |
| NAME RIGHT | Name strap with optional fields |
| TICKER MANUAL | Basic static text strap |
| TICKER SHEET | Dynamic ticker using Google Sheet (and RSS) as **data source**|

## SPX Template Definition
Each template has a Javascript configuration object to expose desired features and default values to GC. See GC documentation for details.

Example configuration for a simple 1 field text template:

```html
<script type="text/javascript">
    window.SPXGCTemplateDefinition = {
        "description": "One liner",
        "playserver": "OVERLAY",
        "playchannel": "1",
        "playlayer": "8",
        "webplayout": "8",
        "out": "manual",
        "uicolor": "7",
        "DataFields": [
            {
                "field" : "f0",
                "ftype" : "textfield",
                "title" : "Simple text strap",
                "value" : "Firstname Lastname"
            }
        ]};
</script>
```





## "Debug"
Templates utilizes [webcg-devtools](https://github.com/indr/webcg-devtools) for browser based testing. You can open a html file in a browser and give **?debug=true** url parameter to open WebCG devtool user interface.

```sh
SPX1_INFO_RIGHT.html?debug=true
```
Inspect SPX Template Definition object to understand what fields the template expects for it to function properly. 
> Note: the debug feature is NOT extensively tested with the templates in this starter pack...

## Customization options 
All the templates in this demo pack uses **customize.css** for fonts and colors. You can edit the values in the file and re-play any of the templates to see the effect. There are several example customizations in css -folder. Overwrite the existing customize.css with any of the example files.
- **Googly** -  white backgrounds and clear bright colors. (This is the default one.)
- **Swedish furniture** - bold typography with bluish-yellowish colors
- **Motorway** - black and red colors on angled backgrounds.
- **Day spa** - muted, translucent colors and rounded corners

[![snapshot](http://www.smartpx.fi/gc/img/pack1_demo_customizations.png)](http://smartpx.fi/gc/)

**Remember**, these customizations only effect some visual aspects of these demo templates. Animations and layout stays mostly the same. For production purposes a custom made template pack is _the way to go_. [Get in contact](http://www.smartpx.fi/gc/custom_templates) if you need help in creating bespoke templates with advanced features (social media integration, impactful animations, responsive "linked" layers, image galleries, map animations, graphs, particle effects etc...)

## MIT License
Copyright 2020 SmartPX tuomo@smartpx.fi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.