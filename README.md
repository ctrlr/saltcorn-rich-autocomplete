# Saltcorn Rich Autocomplete

A starter Saltcorn plugin that adds a configurable **Rich Autocomplete Search** view template.

It creates a search box with a dropdown that can show:

- title
- thumbnail/poster image
- subtitle
- meta value such as rating or duration
- custom link pattern

## Example settings for a video site

Create a new view using **Rich Autocomplete Search** and configure:

| Setting | Value |
|---|---|
| Table name | `videos` |
| Field to search | `title` |
| Title field | `title` |
| Thumbnail/image field | `poster_image` |
| Subtitle field | optional, such as `description` |
| Meta field | `avg_rounded` or `duration_seconds` |
| Link pattern | `/page/stage?id={{id}}` |
| Result limit | `8` |
| Minimum characters | `2` |

## Install locally

On the Saltcorn server, unzip this folder somewhere like:

```bash
/home/linux1/saltcorn-rich-autocomplete
```

Then install it:

```bash
saltcorn install-plugin -d /home/linux1/saltcorn-rich-autocomplete
```

Or in Saltcorn admin:

1. Settings → Plugins
2. Three-dot menu → Add another plugin
3. Source: `local`
4. Location: full folder path
5. Create

Saltcorn's plugin docs describe plugins as JavaScript/Node packages with a `package.json` and main JS file, and plugins can add view patterns/view templates.

## Important test note

This is a starter plugin. Saltcorn plugin route mounting can vary by version/theme setup. If `/plugins/saltcorn-rich-autocomplete/search` 404s, change the `endpoint` line in `index.js` to match your Saltcorn plugin route base.

## Security note

The search route only accepts simple table/field identifiers like `videos`, `title`, and `poster_image`. This is intentional to reduce SQL injection risk.
