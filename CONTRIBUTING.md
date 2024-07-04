
> Updated 2024-07-01

<a id="foreword"></a>



# Foreword

_by Tuomo Kulomaa, founder of SPX_

**SPX-GC project was originally released in September 2020 and has been maintained almost solely by yours truly... Until now ❤**

<details>
<summary>Expand to read the foreword...</summary>

<small>Not interested? Jump to [content](#start).</small>

SPX Graphics Controller has grown from a personal baby-project into a full time job and a growing ecosystem of processes, tools, global users and customers, fans even! Some I even consider personal friends.

There are professional production teams in all timezones relying on SPX daily. The open nature of SPX allowing flexible and powerful HTML graphics workflows while using any graphic template has proven to be an appreciated architecture. This brings in new users every day. 

SPX ecosystem is growing and will continue to grow at an ever increasing speed. TV broadcasters and live production teams have started migrating from massive propriatery graphics tools and processes to open, lightweight, HTML-based ones. SPX as an open alternative is being recognized in this revolution and is actively working in standardizing HTML-based graphics workflows for a wider adoption in the industry. We work actively with [EBU - European Broadcasting Union](https://www.ebu.ch/home) and [IBC Accelerator program](https://show.ibc.org/accelerator-project-evolution-control-room) in this field. Some of this work will be published in September at the [IBC2024 trade show](https://show.ibc.org/).

Creating software is pretty hard on it's own, but maintaining and supporting it is even harder. 

Writing software is approximately 10% of the work. 90% of the work is supporting users, maintaining documentation and example materials, tutorials, adding and maintaining Knowledge Base and Store content, creating back-office processes and tools, project management, CMS, doing customer projects and partner integrations and documenting those again. 

And the bigger the project grows, the slower it gets to get new features out the door. New and old features needs to be tested, new documentation needs to be created and old updated. (Going from 1.2.1 to 1.3.0 took us ∼10 months)

As some parts of the project are turning more into a business, we will also need to treat some parts of it as such. Businesses needs resources and resources cost money. Online services, servers and other tools costs money. Clients need support, support takes time and time is money.

You probably guess where this is going.

A new, paid SPX is now available in the SPX Store for a very reasonable one time purchase. It is targeted for users who want a convenient way to install and run the software, use the very latest features and API functionalities - while supporting the project. There is also an optional VIP Support Subscription available for professional teams producing commercial work and who needs speedy response times, personal support and ticketing platform to track the progress of any open support or feature requests. 

As we still want to have SPX available for a wide range of users, all past versions will become 100% free when a new version is released. Past versions can be used by anybody for anything without any restrictions. 

We trust our users will find this approach reasonable.

And as SPX-GC is MIT licensed, the constantly maintained source code of the app will remain open and free, and developers and software enthusiasts, like yourself, can clone and run the latest version of it as always.

We haven't been very good open source citizens.

We haven't encouraged community contributions, improvements or bug fixes thus far. Issues and PR's have been left unresolved or commented. My personal goal is now to change that - and invite anybody who is interested in developing SPX features, graphics, extensions, plugins, documentation or services to join SPX Team and contribute here on Github. This is probably why you are reading this anyway!

SPX Marketplace will open soon.

One of the drivers of global HTML adoption will be SPX Marketplace, where any developer or designer can open a storefront to a global SPX and HTML graphics audience at large. If you have ideas or have already developed plugins, templates, template packs, extensions or utility applications for HTML-graphics, SPX Marketplace can provide an interesting and active platform for you. Marketplace will most likely open in August 2024.

Thanks for reading! I'm looking forward seeing your contributions in my inbox soon. Please be gentle, this is new to me!

Please [contact me directly](mailto:tuomo@softpix.io) if you have any questions, comments or suggestions!

Tuomo Kulomaa<br>
Founder of SPX
</details>

<br>

<a id="start"></a>
# Contributing to SPX Graphics Controller

> <small>Remember: we are just starting, so these guidelines will evolve... Did you read the [foreword](#foreword)?</small>

There are a lot of ways to contribute to SPX and we love your help! As a community we are friendly, helpful, open and value everyone's time. 

* [🐛 - Found a bug or a typo?](#bug)
* [💡 - Improve code](#improve)
* [💬 - Help SPX community](#help)
* [✨ - Create stuff](#create)
* [💻 - Dev environment](#env)
* [🎨 - Code style](#style)
* [🔢 - About version numbering](#semver)

<br>

<a id="bug"></a>
## 📢 Found something? Say something! 
If you come across a bug, typo, obsolete, missing or incorrect information on our [website](https://spx.graphics), Knowledge Base (the [original](https://spxgc.tawk.help) or the [new](https://intercom.help/spx-graphics/en/)) , [README file](README.md), [RELEASE NOTES file](RELEASE_NOTES.md), this document or elsewhere, please report it by submitting a [support ticket](https://www.spx.graphics/support) or a [Github issue](https://github.com/TuomoKu/SPX-GC/issues/new) so it can be fixed for everyone.

<br>

<a id="improve"></a>
## 💹 Improve code
If you want to fix a bug, improve or add functionality or documentation
* fork the project
* create a feature branch
* make your changes, and
* send a pull request!

Please have a look at our [coding style](#style) before getting to work. 

Need ideas? Check out [issues](https://github.com/TuomoKu/SPX-GC/issues) for smaller tasks or [feature requests](https://spx.kampsite.co/) for bigger projects. Also our [Discord server](https://bit.ly/joinspx) has occasional ideas and requests.

◼ We encourage to make small, incremental changes. If you are interested in creating new features or make other bigger changes, please discuss those with maintainers first! We value your help and don't want you to spend time on something we cannot merge for some reason.

◼ If your modification has any _user facing implications_, it will need to be mentioned in the Release Notes. These remarks should succinctly describe the change and are often tagged as a change, addition, improvement, a bug fix or other relevant description.

> 📆 We try to be active and respond to PR's or comments in a couple of working days.

<br>

<a id="help"></a>
## 💬 Help out on our Discord server
[Join our Discord](https://bit.ly/joinspx) server and see if there are any questions that you can answer. You can also share your tips, tutorials and showcase work you are proud of!

<br>

<a id="create"></a>
## ✨ Create stuff
SPX Marketplace will open Q3-2024 and you can setup a storefront for your creations there. Graphics, plugins, extensions, tutorials, integrations... Interested? Join our [mailing list](mailto:info@softpix.io?subject=marketplace-mailinglist) and stay in the loop.

<br>
<br>

<a id="env"></a>
## Dev environment 💻

Nothing specific is needed. You need
* computer (PC, Mac, Linux)
* code editor (VS Code is recommended)
* Git
* GitHub account
* cloned repository

For HTML template development, we usually use `gulp` for building distribution files from source code. Built process uses environment variable to introduce where SPX is installed, so production code is built there automatically.

```sh
## Add your SPX folder to environment variables:

SPX_ROOT_FOLDER = C:\APPS\SPX\
```

For SPX Marketplace product development, we will soon open developer documentation and example projects. 

<br>
<br>

<a id="style"></a>
## Coding style 🎨

No exact style guidelines exist yet, but there are some our generic Javascript-related principles we would like to bring to your attention. This content will be moved to our Developer Docs later.

* **Indentation**: use 2 spaces
* **Use `camelCasing`.** No `_snake_case_` or `kebab-case` names.
* **Avoid comments.** Instead use descriptive variable and function names. Code should be easy to read and follow as-is. Comments are often left unchanged, and in no-time they are not helping anymore - on the contrary; they actually lie! Comments are fine when an explanation is needed for a special or complex procedure... 
* **Brevity is not a virtue!** Do not try to make your routines as compact and short as possible. Super compressed code is hard to read and refactor. Use descriptive naming. 
* **Always follow the D.R.Y. principle!** (Don't Repeat Yourself) If you need to process anything _more than once_ create utility functions or variables. Never copy code to multiple places. SPX has utility functions for many things, use them or add a new one. And if you do, try to make it generic for other similar use cases also.
* **No prettifiers.** Especially when doing HTML-templates, they often have intricate animations and forcing code to a set max line-width may lead to difficult formatting and hard to follow timing logic.
* **Avoid nested if-statements and else-ifs.** Use `switch` instead, that's more readable and easier to extend in the future.
* **Exit early.** If your function expects arguments, check them first and `return` if those are missing or invalid.
* **Handle types.** Since we are not using TS, we will need to take care of type conversions ourselves. When calculating numerical values use `parseFloat()` or
`parseInt()` whenever suitable. Check for invalid values and handle as needed. When comparing strings, force them to same case with `toLowerCase()` first.
* **Use default fallback values.** Do not let the server crash because of a type conflict or an `undefined`. Fallback to default value, but also notify user (or yourself!) as appropriate with UI methods, logger or even `console.log()`.
* **Prefer single quotes.** With nested strings, doublequotes are obviously needed also.
* **Opening brackets** should be on the same line as the method they below to. If using bracklets on their own lines, it will break indentation and make code blocks harder to follow.
* **Clean up.** Before sharing code, remove orphan code, comments and console statements and make sure your work looks tidy overall - and especially it works as expected in all use cases, from the UI or when executed with API calls. 

<a id="snippets"></a>
<br>

⛔ **NOT THIS** Ugly example - we don't like this "unreadable" style:
```js
/**
 * Something here. Will document later.
 */
function c_2_f(_z)
    {
        let _x = String((9/5*_z)+32)
        return _x + "°F"
    }
```

<br>

✅ **BUT THIS** More verbose, but safer, easier to read, understand and to modify:

```js
function celsiusToFahrenheitFormat(cValue) {
    if (!cValue) {
        logger.error('Celsius value missing, exiting!')
        return null
    }
    
    const cFloat = parseFloat(cValue)
    const fValue = ((9/5) * cFloat) + 32
    const fFormat = fValue + '°F'
    return fFormat
}
```
Good code is harmonious and easy to read and makes sense overall. No comments needed. 


<a id="semver"></a>
<br>

## Version numbering & Release Notes 🔢
Semver numbering (v0.00.00) has been used also in the source repository in the past, but going forward, changes will start to happen in smaller chunks and version numbering in that sense will lose its purpose. Semver numbering will be applied to official binary releases.

To handle rolling changes, each merge to master will append information to the [Release Notes](RELEASE_NOTES.md).