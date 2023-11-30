/**
 * Scaler School of Technology Application
 * @format
 */

import React, {useEffect, useState, createContext} from 'react'; // importing react module
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native'; // importing react-native
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'; // to implement google sign in
import LinearGradient from 'react-native-linear-gradient'; // implement linear gradient in screens
import Logo from './assets/images/scaler_logo.svg'; // import scaler school of technology SVG logo
import HavingTrouble from './src/components/HavingTrouble'; // show the having trouble link in sign in page
import GoogleLogo from './assets/images/google_logo.svg'; // import the Google SVG logo
import DeviceInfo from 'react-native-device-info'; // module to bring device info from
import GetLocation from 'react-native-get-location'; // get user location from device
import FlashMessage, {showMessage} from 'react-native-flash-message'; // module to flash messages on device screen

import WelcomeMessage from './src/components/WelcomeMessage';
import SeatingPlan from './src/components/SeatingPlan';
import {ClassView, MarkAttendanceButton} from './src/components/ClassView';
import AppVersionView from './src/components/AppVersionView';

import signToken from './src/utils/signToken';

import {domain_URL, APP_VERSION} from './src/constants';
import DidContext from './src/contexts/DidContext';

export default function App(): JSX.Element {
  const [loggInError, setLoggInError] = useState(null); // check if user logged in or not
  const [userLoggedIn, setUserLoggedIn] = useState(false); // check if user logged in or not
  const [userEmail, setUserEmail] = useState('Anonymous'); // state to store user email
  const [did, setdid] = useState(''); // state to store Device ID from react-native-device-info
  const [userCord, setUserCord] = useState([]); // state to store user coordinates
  // state to store marking attendance
  const [userName, setUserName] = useState(''); // state to store username
  const [ClassData, setClassData] = useState(null); // state to store class data.

  /**
   * Effect to configure Google Sign In for application
   * */
  useEffect(() => {
    GoogleSignin.configure();
  }, []);

  useEffect(() => {
    DeviceInfo.getUniqueId().then(uniqueId => {
      setdid(uniqueId);
    });
  }, []);

  /**
   * Function to check validity of device for marking attendance.
   *
   * return true if phone is either in developer mode, debug mode or is Jail Broken
   * */

  function doNoting() {}

  /**
   * get height of device screen from react-native
   * */
  const {height} = useWindowDimensions();

  /**
   * Function to sign out user.
   * */
  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      if (userLoggedIn) {
        setUserLoggedIn(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (userLoggedIn) {
    return (
      <DidContext.Provider value={did}>
        <View>
          <StatusBar animated={true} backgroundColor="#1a1a1a" />

          <LinearGradient
            colors={['#5B5ABE', '#6D73FB', '#85A0FF']}
            style={{height: '100%'}}>
            <StatusBar animated={true} backgroundColor={'#5B5ABE'} />

            <View style={{width: '100%', height: 'max-content'}}>
              <WelcomeMessage />

              <Text style={LoginStyles.username}>{userName}</Text>
            </View>

            {/*  Seating Display */}

            <SeatingPlan student={userEmail} />

            {/* Class Display */}
            <ClassView ClassData={ClassData} />
            <MarkAttendanceButton ClassData={ClassData} />
          </LinearGradient>
          <FlashMessage position="bottom" style={{marginBottom: '5%'}} />
        </View>
      </DidContext.Provider>
    );
  } else {
    async function LoginWithGoogleNow() {
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();

        const userEmail = userInfo.user.email;
        const domain_name_provider = userEmail?.split('@')[1];
        const token = await signToken(userEmail, did);

        if (
          domain_name_provider === 'sst.scaler.com' ||
          domain_name_provider === 'scaler.com'
        ) {
          const UserToLogin = {
            name: userInfo.user.name,
            jwtToken: token,
          };

          let statCode = 400;
          fetch(domain_URL + '/attendance/register/', {
            method: 'POST',
            body: JSON.stringify(UserToLogin),
          })
            .then(async response => {
              // Handle the response
              console.log(response);
              if (response.status == 200) {
                statCode = 200;
              } else if (response.status >= 400 && response.status < 500) {
                let errorMessage = await response.json();
                setLoggInError(errorMessage.message);
                throw new Error(errorMessage.message);
              } else {
                throw new Error('Network response was not ok.');
              }
            })
            .then(data => {
              // User allowed login
              statCode = 200;

              if (statCode == 200) {
                setUserEmail(userEmail);
                const username = userInfo.user.name?.split(' ');
                // @ts-ignore
                username.concat(' ');
                setUserName(username[0] + ' ' + username[1]);
                fetch(domain_URL + '/attendance/getcurclassattendance/', {
                  method: 'POST',
                  body: JSON.stringify({
                    token: did,
                  }),
                })
                  .then(response => {
                    return response.json();
                  })
                  .then(classes => {
                    console.log(classes);

                    if (classes) {
                      classes.attendance_start_time =
                        classes.attendance_start_time
                          ? new Date(classes.attendance_start_time)
                          : null;
                      classes.attendance_end_time = classes.attendance_end_time
                        ? new Date(classes.attendance_end_time)
                        : null;
                      classes.class_start_time = classes.class_start_time
                        ? new Date(classes.class_start_time)
                        : null;
                      classes.class_end_time = classes.class_end_time
                        ? new Date(classes.class_end_time)
                        : null;

                      classes.attendance_time = classes.attendance_time
                        ? new Date(classes.attendance_time)
                        : null;
                    }
                    setClassData(classes);
                  });
                setUserLoggedIn(true);
              } else {
                console.log('Some error at backend');
                signOut();
              }
            })
            .catch(error => {
              statCode = 400;
              signOut();
              setLoggInError('' + error);
            });
        } else {
          setLoggInError('User Not authorised to signin');
          console.log('User Not authorised to signin');
          signOut();
        }
      } catch (error) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log('SIGN IN CANCELLED');
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log('SIGNING IN');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log('PLAY SERVICES NOT AVAILABLE');
        } else {
          console.log(error);
        }
      }
    }

    // @ts-ignore
    return (
      <View>
        <StatusBar animated={true} backgroundColor="#5B5ABE" />

        <LinearGradient
          colors={['#5B5ABE', '#6D73FB', '#85A0FF']}
          style={{height: '100%'}}>
          <View style={styles.root}>
            <Logo size={height * 0.4} style={styles.logo} />
          </View>
          <AppVersionView />
          <View style={[styles.atBottom]}>
            <HavingTrouble error={loggInError} />
            <Pressable
              style={googlestyles.container}
              onPress={LoginWithGoogleNow}>
              <GoogleLogo />

              <Text style={googlestyles.data}>Login with Google</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    maxWidth: 300,
    maxHeight: 100,
    marginVertical: '25%',
  },
  atBottom: {
    padding: 15,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    marginBottom: '3%',
  },
});

const LoginStyles = StyleSheet.create({
  username: {
    fontSize: 40,
    marginTop: '5%',
    marginHorizontal: '8%',
    color: '#EAEAEAFF',
  },
  classcontainer: {
    backgroundColor: 'rgba(255, 251, 251, 0.21)',
    width: '85%',
    height: '100%',
    marginVertical: '8%',
    borderRadius: 20,
  },
  markButton: {
    width: '70%',
    backgroundColor: '#12142d',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '13%',
    borderRadius: 20,
  },
});

const googlestyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: '90%',
    height: 65,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  data: {
    color: '#333333',
    fontSize: 18,
    paddingLeft: 25,
    fontFamily: 'Alata Regular',
  },
});

const msstyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    width: '90%',
    height: 65,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  data: {
    color: '#cacaca',
    fontSize: 18,
    paddingLeft: 25,
    fontFamily: 'Alata Regular',
  },
});
