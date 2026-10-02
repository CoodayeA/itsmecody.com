# How to publish a blog post

Posts live in the `_posts` folder as Markdown files. Adding one publishes it to https://itsmecody.com/writing/ in about a minute. It also appears on the homepage, in the RSS feed, and in the sitemap automatically.

## From any browser (including your phone)

1. Go to https://github.com/CoodayeA/itsmecody.com/new/main/_posts
2. Name the file `YYYY-MM-DD-short-title.md`, for example `2026-10-15-my-first-qbr-playbook.md`.
   The part after the date becomes the URL: itsmecody.com/writing/my-first-qbr-playbook/
3. Paste this at the top, then write below it:

       ---
       title: "Your post title"
       description: "One or two sentences for the post list and link previews."
       date: 2026-10-15
       ---

4. Click "Commit changes". The post goes live in about a minute.

## Editing or deleting a post

Open the file in https://github.com/CoodayeA/itsmecody.com/tree/main/_posts, then click the pencil icon to edit or the trash icon to delete.

## Drafts

Files in `_drafts` are never published. Keep work in progress there, then move the file into `_posts` (with a date in the name) when it's ready. `_drafts/_template.md` is a starting point.

## Markdown cheat sheet

    ## Section heading
    **bold** and *italic*
    [link text](https://example.com)
    - bullet
    > pull quote
    ![image description](/images/photo.png)   (upload images to an /images folder first)

Tip: avoid em dashes. Use commas, periods, or "and" instead.
