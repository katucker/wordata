var ghpages = require('gh-pages');

ghpages.publish(
	'public',
	{
		branch: 'gh-pages',
		silent: true,
		repo: 'https://' + process.env.GITHUB_TOKEN + '@github.com/katucker/wordata.git',
		user: {
			name: 'Keith Tucker',
			email: 'tuck220@icloud.com'
		}
	},
	() => {
		console.log('Deploy Complete!')
	}
)