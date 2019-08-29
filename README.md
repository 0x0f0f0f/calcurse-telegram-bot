# Calcurse Telegram Bot

A small Telegram bot to parse and manage [calcurse](https://calcurse.org) **todo** files and **appointments**.
It expects to find calcurse's data directory in a git repository (I use this with my dotfile repository) which
the bot will clone, and manage automatically.

To get notifications when todos are pushed to the data repo, there's an example [git hook](https://www.digitalocean.com/community/tutorials/how-to-use-git-hooks-to-automate-development-and-deployment-tasks): `post-receive.sample` so that when the data git repository is received, 
the bot will be notified with a `SIGPIPE` and a TODO diff will be generated, parsed and sent.


# Roadmap

- [ ] editing/completing todos
- [ ] Read notes
- [ ] Test suite
- [X] Parse appointments
- [X] Create new todo
- [x] Notify on new/deleted/completed todos
- [x] Parse todos

# Setup

TODO: Cover setup