var app = angular.module('teacherDiaryApp', []);

app.controller('TeacherViewController', function($scope, $http) {
    
    // ==========================================
    // CONFIGURATION CONFIG: ENTER YOUR LINKS HERE
    // ==========================================
    // This remains your original diary entries response sheet CSV link
    var googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVlG3VWvzvOzwo36khFV8DA-GoDYSidPBo2i8YWvraDM3eQSkegVaz39x-8Qa4W8Fzf5-raMnSUauM/pub?gid=588909063&single=true&output=csv';

    // Paste your BRAND NEW standalone Registry Sheet CSV URL here
    var registryCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKsJnIL98uvAr-RpzFN8Ozx6H73IAqYqfLpSmI1hM5PzWCvpdMe9ZofWbmbmo8229Up044R3F6kcdm/pub?gid=0&single=true&output=csv';
    // ==========================================

    $scope.teacherRegistry = {};
    $scope.isLoggedIn = false;
    $scope.currentTeacher = '';
    $scope.loginData = { teacherName: '', pin: '' };
    $scope.personalEntries = [];
    $scope.isLoading = false;

    // Load credential database live from Cloud Registry
    $scope.initTeacherPortal = function() {
        $http.get(registryCsvUrl).then(function(res) {
            var parsed = Papa.parse(res.data, { header: true, skipEmptyLines: true });
            parsed.data.forEach(function(row) {
                if(row['Teacher Name'] && row['PIN']) {
                    $scope.teacherRegistry[row['Teacher Name'].trim()] = String(row['PIN']).trim();
                }
            });
            verifySavedSession();
        }).catch(function(err) {
            console.error("Registry load error: ", err);
        });
    };

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
        var suppliedPin = String($scope.loginData.pin).trim();

        if (!$scope.teacherRegistry.hasOwnProperty(targetUser)) {
            alert("This teacher name is not registered.");
            return;
        }

        if ($scope.teacherRegistry[targetUser] === suppliedPin) {
            $scope.isLoggedIn = true;
            $scope.currentTeacher = targetUser;
            
            sessionStorage.setItem('activeTeacherUser', targetUser);
            sessionStorage.setItem('teacherAuthToken', 'authenticated_teacher_secure_' + targetUser);
            
            $scope.loadIsolatedTeacherData();
        } else {
            alert("Security Error: Incorrect authentication PIN.");
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

    /*$scope.loadIsolatedTeacherData = function() {
        $scope.isLoading = true;
        $http.get(googleSheetCsvUrl)
            .then(function(response) {
                var parsedResult = Papa.parse(response.data, { header: true, skipEmptyLines: true });
                var rawEntries = parsedResult.data;
                
                rawEntries.forEach(function(row) {
                    row['Teacher Name'] = row['Teacher Name'] || row['entry.1416561559'];
                    row['Subject'] = row['Subject'] || row['entry.389868599'];
                    row['Date'] = row['Date'] || row['entry.1404280910'];
                    row['Status'] = row['Status'] || row['entry.1247247380'];
                    row['Classroom Records'] = row['Classroom Records'] || row['entry.1058626871'];
                    row['Topics Covered'] = row['Topics Covered'] || row['entry.1740253895'];
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
    }; */

    $scope.loadIsolatedTeacherData = function() {
    $scope.isLoading = true;
    $http.get(googleSheetCsvUrl)
        .then(function(response) {
            var parsedResult = Papa.parse(response.data, { header: true, skipEmptyLines: true });
            var rawEntries = parsedResult.data;
            
            // 1. Normalize field names
            rawEntries.forEach(function(row) {
                    row['Teacher Name'] = row['Teacher Name'] || row['entry.1416561559'];
                    row['Subject'] = row['Subject'] || row['entry.389868599'];
                    row['Date'] = row['Date'] || row['entry.1404280910'];
                    row['Status'] = row['Status'] || row['entry.1247247380'];
                    row['Classroom Records'] = row['Classroom Records'] || row['entry.1058626871'];
                    row['Topics Covered'] = row['Topics Covered'] || row['entry.1740253895'];
                });

            // 2. Filter entries for the logged-in teacher
            var teacherRows = rawEntries.filter(function(row) {
                return row['Teacher Name'] && row['Teacher Name'].trim() === $scope.currentTeacher;
            });

            // 3. Deduplicate: Map by Date keeping ONLY the latest entry submitted
            var latestEntriesByDate = {};
            
            // Loop through entries sequentially (Google Sheets appends new rows at the bottom)
            teacherRows.forEach(function(row) {
                if (row['Date']) {
                    var dateKey = row['Date'].trim();
                    // Overwriting the key ensures the LAST (latest) row for that date wins!
                    latestEntriesByDate[dateKey] = row; 
                }
            });

            // 4. Convert back to array and sort descending by Date
            $scope.personalEntries = Object.values(latestEntriesByDate).sort(function(a, b) {
                return new Date(b['Date']) - new Date(a['Date']);
            });

            $scope.isLoading = false;
        })
        .catch(function(err) {
            alert("Failed to sync database entries securely.");
            $scope.isLoading = false;
        });
};




    

    $scope.initTeacherPortal();
});
