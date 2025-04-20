import click

@click.group()
def cli():
    pass

@cli.command()
def hello():
    click.echo('Hello from Engiyn plugin!')


def register_cli(cli_group):
    cli_group.add_command(hello)
