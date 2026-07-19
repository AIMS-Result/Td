var app = angular.module('teacherDiaryApp', []);

app.controller('TeacherViewController', function($scope, $http) {
    
    // !!! REPLACE WITH YOUR GOOGLE SHEETS PUBLISHED CSV URL !!!
    var googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVlG3VWvzvOzwo36khFV8DA-GoDYSidPBo2i8YWvraDM3eQSkegVaz39x-8Qa4W8Fzf5-raMnSUauM/pub?gid=588909063&single=true&output=csv';
   
// Paste your BRAND NEW independent Staff Registry CSV link here:
    var registryCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKsJnIL98uvAr-RpzFN8Ozx6H73IAqYqfLpSmI1hM5PzWCvpdMe9ZofWbmbmo8229Up044R3F6kcdm/pub?gid=0&single=true&output=csv';

    $scope.teacherRegistry = {};

   /* $scope.isLoggedIn = false;
    $scope.currentTeacher = '';
    $scope.loginData = { teacherName: '', pin: '' };
    $scope.personalEntries = [];
    $scope.isLoading = false;*/
    $scope.initTeacherPortal = function() {
    $http.get(registryCsvUrl).then(function(res) {
        var parsed = Papa.parse(res.data, { header: true, skipEmptyLines: true });
        parsed.data.forEach(function(row) {
            if(row['Teacher Name'] && row['PIN']) {
                $scope.teacherRegistry[row['Teacher Name'].trim()] = String(row['PIN']).trim();
            }
        });
        // Check for old login sessions
        var activeUser = sessionStorage.getItem('activeTeacherUser');
        var secureKey = sessionStorage.getItem('teacherAuthToken');
        if (activeUser && secureKey === 'authenticated_teacher_secure_' + activeUser) {
            $scope.isLoggedIn = true;
            $scope.currentTeacher = activeUser;
            $scope.loadIsolatedTeacherData();
        }
    });
};

// CRITICAL: Call it immediately
$scope.initTeacherPortal();


    function verifySavedSession() {
        var activeUser = sessionStorage.getItem('activeTeacherUser');
        var secureKey = sessionStorage.getItem('teacherAuthToken');
        
        if (activeUser && secureKey === 'authenticated_teacher_secure_' + activeUser) {
            $scope.isLoggedIn = true;
            $scope.currentTeacher = activeUser;
            $scope.loadIsolatedTeacherData();
        }
    }

    $scope.login = function() {
        var targetUser = $scope.loginData.teacherName.trim();
        var suppliedPin = $scope.loginData.pin;

        if (!$scope.teacherRegistry.hasOwnProperty(targetUser)) {
            alert("Error: Your name is not registered.");
            return;
        }

        if ($scope.teacherRegistry[targetUser] === suppliedPin) {
            $scope.isLoggedIn = true;
            $scope.currentTeacher = targetUser;
            
            sessionStorage.setItem('activeTeacherUser', targetUser);
            sessionStorage.setItem('teacherAuthToken', 'authenticated_teacher_secure_' + targetUser);
            
            $scope.loadIsolatedTeacherData();
        } else {
            alert("Security Error: Incorrect PIN.");
        }
    };

    $scope.logout = function() {
        sessionStorage.removeItem('activeTeacherUser');
        sessionStorage.removeItem('teacherAuthToken');
        $scope.isLoggedIn = false;
        $scope.currentTeacher = '';
        $scope.loginData = { teacherName: '', pin: '' };
        $scope.personalEntries = [];
    };

    $scope.loadIsolatedTeacherData = function() {
        $scope.isLoading = true;
        $http.get(googleSheetCsvUrl)
            .then(function(response) {
                var parsedResult = Papa.parse(response.data, {
                    header: true,
                    skipEmptyLines: true
                });
                
                var rawEntries = parsedResult.data;
                
                rawEntries.forEach(function(row) {
                    row['Teacher Name'] = row['Teacher Name'] || row['entry.111111111'];
                    row['Subject'] = row['Subject'] || row['entry.222222222'];
                    row['Date'] = row['Date'] || row['entry.333333333'];
                    row['Status'] = row['Status'] || row['entry.444444444'];
                    row['Classroom Records'] = row['Classroom Records'] || row['entry.555555555'];
                    row['Topics Covered'] = row['Topics Covered'] || row['entry.666666666'];
                    row['Remarks'] = row['Remarks'] || row['entry.777777777'];
                });

                $scope.personalEntries = rawEntries.filter(function(row) {
                    return row['Teacher Name'] && row['Teacher Name'].trim() === $scope.currentTeacher;
                }).sort(function(a, b) {
                    return new Date(b['Date']) - new Date(a['Date']);
                });

                $scope.isLoading = false;
            })
            .catch(function(err) {
                alert("Failed to sync database entries securely.");
                $scope.isLoading = false;
            });
    };

    verifySavedSession();
});

