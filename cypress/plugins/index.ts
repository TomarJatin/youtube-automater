// cypress/plugins/index.js
module.exports = (on: any, config: any) => {
	// save all test results as a JSON file
	// https://github.com/bahmutov/cypress-json-results
	require('cypress-json-results')({
		on,
		filename: 'cypressResult.json', // default filename
		//   githubActionsSummary: 'test'
	});
};
