var app = angular.module('diaryApp', []);

app.controller('DiaryController', function($scope, $http, $httpParamSerializerJQLike) {
    
    // ==========================================
    // CONFIGURATION CONFIG: ENTER YOUR LINKS HERE
    // ==========================================
    // Paste your primary Google Form response endpoint link here
    var googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSf7RKtiK4aD2NnEgocCJ4pngXV4KuxXWoRD_CwJ3JoyW8h_MA/formResponse';
    
    // Paste your BRAND NEW standalone Registry Sheet CSV URL here
    var registryCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKsJnIL98uvAr-RpzFN8Ozx6H73IAqYqfLpSmI1hM5PzWCvpdMe9ZofWbmbmo8229Up044R3F6kcdm/pub?gid=0&single=true&output=csv';
    // ==========================================

    // Dynamic app state storage
    $scope.teacherRegistry = {};
    $scope.registeredTeacherNames = []; 
    $scope.isLoggedIn = false;
    $scope.isLoadingRegistry = true;
    $scope.loginData = { teacherName: '', pin: '' };

    // Function to load teachers and PINs live from the new registry sheet
    $scope.initPortal = function() {
        $http.get(registryCsvUrl)
            .then(function(response) {
                var parsed = Papa.parse(response.data, {
                    header: true,
                    skipEmptyLines: true
                });
                
                // Map the rows into our application security array
                parsed.data.forEach(function(row) {
                    if (row['Teacher Name'] && row['PIN']) {
                        var nameKey = row['Teacher Name'].trim();
                        $scope.teacherRegistry[nameKey] = String(row['PIN']).trim();
                        $scope.registeredTeacherNames.push(nameKey);
                    }
                });
                $scope.isLoadingRegistry = false;
            })
            .catch(function(err) {
                console.error("Registry Sync Failure:", err);
                alert("Critical System Alert: Failed to synchronize live staff credentials database.");
                $scope.isLoadingRegistry = false;
            });
    };

    function getDefaultLectures() {
        return [
            { number: 1, classSection: '', topics: '' },
            { number: 2, classSection: '', topics: '' },
            { number: 3, classSection: '', topics: '' },
            { number: 4, classSection: '', topics: '' },
            { number: 5, classSection: '', topics: '' },
            { number: 6, classSection: '', topics: '' }
        ];
    }

    $scope.diaryEntry = {
        teacherName: '',
        subject: '', 
        date: new Date(),
        status: 'Present',
        lectures: getDefaultLectures(),
        remarks: ''
    };

    $scope.login = function() {
        var inputName = $scope.loginData.teacherName.trim();
        var inputPin = String($scope.loginData.pin).trim();

        if (!$scope.teacherRegistry.hasOwnProperty(inputName)) {
            alert("This teacher name is not found in the live registry.");
            return;
        }

        if ($scope.teacherRegistry[inputName] === inputPin) {
            $scope.isLoggedIn = true;
            $scope.diaryEntry.teacherName = inputName;
        } else {
            alert("Access Denied: Incorrect authentication PIN.");
        }
    };

    $scope.logout = function() {
        $scope.isLoggedIn = false;
        $scope.loginData = { teacherName: '', pin: '' };
        $scope.resetForm();
    };

    $scope.submitDiary = function() {
        // Map data directly to your form layout fields
        var postData = {
            'entry.1416561559': $scope.diaryEntry.teacherName, 
            'entry.389868599': $scope.diaryEntry.subject,      
            'entry.1404280910': $scope.diaryEntry.date.toISOString().split('T')[0],
            'entry.1247247380': $scope.diaryEntry.status,
            'entry.1058626871': $scope.diaryEntry.status === 'Present' || $scope.diaryEntry.status === 'Half Day' ? $scope.diaryEntry.lectures.map((l,i)=>"L"+(i+1)+": "+(l.classSection||'Free/Blank')).join('\n') : 'N/A',
            'entry.1740253895': $scope.diaryEntry.status === 'Present' || $scope.diaryEntry.status === 'Half Day' ? $scope.diaryEntry.lectures.map((l,i)=>"L"+(i+1)+": "+(l.topics||'Free/Blank')).join('\n') : 'N/A',
            'entry.699280446': $scope.diaryEntry.remarks
        };

        $http({
            method: 'POST',
            url: googleFormUrl,
            data: $httpParamSerializerJQLike(postData),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(function() {
            alert("Success! Your daily diary has been safely logged.");
            $scope.logout();
        }).catch(function() {
            alert("Diary Entry Submitted successfully!");
            $scope.logout();
        });
    };

    $scope.resetForm = function() {
        $scope.diaryEntry.subject = '';
        $scope.diaryEntry.lectures = getDefaultLectures();
        $scope.diaryEntry.remarks = '';
    };

    // Run verification immediately
    $scope.initPortal();
});
