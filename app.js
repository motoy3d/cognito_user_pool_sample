'use strict'
var userPools = {};

// 各AWSアカウントのUserPools固有情報
userPools.poolData = {
    UserPoolId: 'ap-northeast-1_8g798FSlW',
    ClientId: '22do653qgnj9827pdt1rg9hdp1'
};
userPools.UserPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(userPools.poolData);

/**
 * 入力されたメールアドレス、ユーザー名、パスワードでサインアップする。
 */
userPools.signup = function() {
    var email = $('#inputEmail').val();
    var username = $('#inputUserName').val();
    var password = $('#inputPassword').val();
    if (!email | !username | !password) { return false; }

    var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({Name: 'email', Value: email});
    var attributeList = [];
    attributeList.push(attributeEmail);

    var message_text;
    userPools.UserPool.signUp(username, password, attributeList, null, function(err, result){
        if (err) {
            console.log(err);
            message_text = err;
        } else {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());

            message_text = cognitoUser.getUsername() + ' が作成されました';
        }
        $('#message').text(message_text);
        $('#message').show();
    });
}

/**
 * 入力された確認コードを検証して結果を表示する。
 */
userPools.verify = function() {
    var username = $('#inputUserName').val();
    var vericode = $('#inputVerificationCode').val();
    if (!username | !vericode) { return false; }

    var userData = {
        Username: username,
        Pool: userPools.UserPool
    };

    var message_text;
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.confirmRegistration(vericode, true, function(err, result) {
        if (err) {
            console.log(err);
            message_text = err;
            $('#message').text(message_text);
            $('#message').append($('<a href="resend.html">再送信</a>')); // 再送信リンクの表示
        } else {
            console.log('call result ' + result);

            message_text = cognitoUser.getUsername() + ' が確認されました';
            $('#message').text(message_text);
        }
        $('#message').show();
    });
}

/**
 * 確認コードを再送する。
 */
userPools.resend = function() {
    var username = $('#inputUserName').val();
    if (!username) { return false; }

    var userData = {
        Username: username,
        Pool: userPools.UserPool
    };

    var message_text;
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            console.log(err);
            message_text = err;
        } else {
            console.log('call result ' + result);

            message_text = '確認コードを再送信しました';
        }
        $('#message').text(message_text);
        $('#message').show();
    });
}

/**
 * 入力されたユーザー名・パスワードでログイン処理を行う。
 */
userPools.login = function() {
    var username = $('#inputUserName').val();
    var password = $('#inputPassword').val();
    if (!username | !password) { return false; }

    var authenticationData = {
        Username: username,
        Password: password
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

    var userData = {
        Username: username,
        Pool: userPools.UserPool
    };

    var message_text;
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function(result) {
            console.log('access token + ' + result.getAccessToken().getJwtToken());

            AWS.config.region = 'ap-northeast-1';
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'Identity Pool の ID',
                Logins: {
                    'cognito-idp.リージョン名.amazonaws.com/ユーザープールID': result.getIdToken().getJwtToken()
                }
            });
            
            AWS.config.credentials.refresh(function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("success");
                    console.log("id:" + AWS.config.credentials.identityId);                    
                }

                $(location).attr('href', 'mypage.html');
            });
            //console.log("id:" + AWS.config.credentials.identityId);
            
            //$(location).attr('href', 'mypage.html');
        },
        mfaRequired: function(codeDeliveryDetails) {
            // MFA is required to complete user authentication.
            // Get the code from user and call
//            cognitoUser.sendMFACode(mfaCode, this)
            console.log("mfaCode要確認");
        },
        // 新パスワードの設定が必要な場合
        newPasswordRequired: function(userAttributes, requiredAttributes) {
            // User was signed up by an admin and must provide new
            // password and required attributes, if any, to complete
            // authentication.

            // the api doesn't accept this field back
            delete userAttributes.email_verified;

            // Get these details and call
            var newPassword = prompt('新しいパスワードを入力してください: ' ,'');
            cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, this);
        },
        onFailure: function(err) {
            if (err && err.code == 'PasswordResetRequiredException') {
                var verificationCode = prompt('検証コードを入力してください ' ,'');
                var newPassword = prompt('新しいパスワードを入力してください ' ,'');
                cognitoUser.confirmPassword(verificationCode, newPassword, {
                    onSuccess() {
                        console.log('Password confirmed!');
                    },
                    onFailure(err) {
                        console.log('Password not confirmed!');
                    }
                });
                
                if (true) {
                    return;
                    //↓はユーザーが「パスワードを忘れた」をクリックした時に呼び出すべきメソッド。
                    // だと思う。
                }
                // パスワードリセットが要求されているステータスの場合の処理
                cognitoUser.forgotPassword({
                    onSuccess: function (data) {
                        // successfully initiated reset password request
            	          console.log('CodeDeliveryData from forgotPassword: ' + data);
                    },
                    onFailure: function(err) {
                        alert(err);
                    },
                    //確認コードがメールで来るので、↓のプロンプトで入力する。
                    //新パスワードも入力して再設定する。 
                    inputVerificationCode: function(data) {
                        console.log('Code sent to: ' + data);
                        var verificationCode = prompt('検証コードを入力してください ' ,'');
                        var newPassword = prompt('新しいパスワードを入力してください ' ,'');
                        cognitoUser.confirmPassword(verificationCode, newPassword, {
                            onSuccess() {
                                console.log('Password confirmed!');
                            },
                            onFailure(err) {
                                console.log('Password not confirmed!');
                            }
                        });
                    }
                });
            } else {
                alert(err);
            }
        }
    });

}

/**
 * ログイン状態をチェックしてログイン済みならユーザー情報を取得して画面に表示。
 * ログアウト状態ならログイン画面へ遷移。
 */
userPools.checkSession = function () {

    var cognitoUser = userPools.UserPool.getCurrentUser();
    if (cognitoUser != null) {
        cognitoUser.getSession(function (err, sessionResult) {
            if (sessionResult) {
                var attrs;
                cognitoUser.getUserAttributes(function (err, attrs) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    $('#username').text('Username:' + cognitoUser.getUsername());

                    for (var i = 0; i < attrs.length; i++) {
                        console.log('name:' + attrs[i].getName() + ", value: " + attrs[i].getValue() );
                        if (attrs[i].getName() == 'email') {
                            $('#email').text('Email: ' + attrs[i].getValue());
                        }
                    }
                });
            } else {
                console.log("session is invalid");
                $(location).attr('href', 'login.html');
            }

        });
    } else {
        console.log("no user");
        $(location).attr('href', 'login.html');
    }
}

/**
 * ログアウトする。
 */
userPools.logout = function() {
    var cognitoUser = userPools.UserPool.getCurrentUser();
    if (cognitoUser != null) {
        cognitoUser.signOut();
        location.reload();
    }
}
